from __future__ import annotations

import asyncio
import logging
from typing import TYPE_CHECKING

import aiohttp
from livekit import rtc
from livekit.agents import (
    DEFAULT_API_CONNECT_OPTIONS,
    LanguageCode,
    stt,
    utils,
    vad,
)
from livekit.agents.types import NOT_GIVEN
from livekit.plugins import silero

if TYPE_CHECKING:
    from livekit.agents import APIConnectOptions
    from livekit.agents.types import NotGivenOr

logger = logging.getLogger("agent.whisper_stt")


class WhisperSTT(stt.STT):
    """Whisper Speech-to-Text progressive streaming client.

    Connects to a Whisper-compatible server (e.g. Speaches or faster-whisper-server).
    Uses Silero VAD for robust speech boundary detection and runs progressive chunk
    recognition to emit real-time interim transcripts during user speech, followed
    by a guaranteed final transcript on end-of-speech.
    """

    def __init__(
        self,
        *,
        ws_url: str = "ws://localhost:10300/v1/audio/transcriptions",
        base_url: str = "http://localhost:10300/v1",
        model: str = "Systran/faster-whisper-tiny.en",
        language: str = "en",
        vad: vad.VAD | None = None,
        interim_interval: float = 0.4,
    ) -> None:
        super().__init__(
            capabilities=stt.STTCapabilities(
                streaming=True,
                interim_results=True,
                diarization=False,
                aligned_transcript=False,
                offline_recognize=True,
            )
        )
        self._ws_url = ws_url
        self._http_url = f"{base_url.rstrip('/')}/audio/transcriptions"
        self._model = model
        self._language = language
        if vad is None:
            try:
                vad = silero.VAD.load()
            except Exception as e:
                logger.warning("Could not load default Silero VAD: %s", e)
        self._vad = vad
        self._interim_interval = interim_interval

    @property
    def model(self) -> str:
        return self._model

    @property
    def provider(self) -> str:
        return "whisper-stream"

    async def _transcribe_audio_raw(
        self,
        wav_bytes: bytes,
        *,
        language: str | None = None,
        session: aiohttp.ClientSession | None = None,
        timeout: float = 10.0,
    ) -> str:
        """Helper to transcribe raw WAV bytes against the Whisper HTTP endpoint."""
        data = aiohttp.FormData()
        data.add_field(
            "file",
            wav_bytes,
            filename="audio.wav",
            content_type="audio/wav",
        )
        data.add_field("model", self._model)
        resolved_lang = language or self._language
        if resolved_lang:
            data.add_field("language", resolved_lang)
        data.add_field("response_format", "json")

        close_session = False
        if session is None:
            session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=timeout)
            )
            close_session = True

        try:
            async with session.post(self._http_url, data=data) as resp:
                if resp.status != 200:
                    err_text = await resp.text()
                    raise RuntimeError(
                        f"Whisper STT HTTP error {resp.status}: {err_text}"
                    )
                res_json = await resp.json()
                return str(res_json.get("text", "")).strip()
        finally:
            if close_session:
                await session.close()

    async def _recognize_impl(
        self,
        buffer: utils.AudioBuffer,
        *,
        language: NotGivenOr[str] = NOT_GIVEN,
        conn_options: APIConnectOptions,
    ) -> stt.SpeechEvent:
        try:
            if isinstance(buffer, rtc.AudioFrame):
                frame = buffer
            else:
                frame = rtc.combine_audio_frames(buffer)
            wav_bytes = frame.to_wav_bytes()

            resolved_lang = language if utils.is_given(language) else self._language
            text = await self._transcribe_audio_raw(
                wav_bytes,
                language=resolved_lang,
                timeout=conn_options.timeout,
            )

            return stt.SpeechEvent(
                type=stt.SpeechEventType.FINAL_TRANSCRIPT,
                alternatives=[
                    stt.SpeechData(
                        text=text,
                        language=LanguageCode(resolved_lang or "en"),
                    )
                ],
            )
        except Exception as e:
            logger.error("Whisper STT recognize failed: %s", e)
            raise

    def stream(
        self,
        *,
        language: NotGivenOr[str] = NOT_GIVEN,
        conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS,
    ) -> WhisperSpeechStream:
        return WhisperSpeechStream(
            stt_instance=self,
            ws_url=self._ws_url,
            conn_options=conn_options,
            language=language if utils.is_given(language) else self._language,
            vad=self._vad,
            interim_interval=self._interim_interval,
        )


class WhisperSpeechStream(stt.SpeechStream):
    """VAD-driven progressive speech stream for Whisper.

    Stays persistently open for the entire room session, streaming interim
    transcriptions as the user speaks, followed by a final transcript on end-of-speech.
    """

    def __init__(
        self,
        *,
        stt_instance: WhisperSTT,
        ws_url: str,
        conn_options: APIConnectOptions,
        language: str | None = None,
        vad: vad.VAD | None = None,
        interim_interval: float = 0.4,
    ) -> None:
        super().__init__(stt=stt_instance, conn_options=conn_options, sample_rate=16000)
        self._stt_instance = stt_instance
        self._ws_url = ws_url
        self._language = language
        if vad is None:
            vad = silero.VAD.load()
        self._vad = vad
        self._interim_interval = interim_interval

    async def _run(self) -> None:
        vad_stream = self._vad.stream()
        speech_frames: list[rtc.AudioFrame] = []
        speaking = False
        last_interim_text = ""
        is_recognizing_interim = False

        http_session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=15, connect=self._conn_options.timeout)
        )

        async def _forward_input() -> None:
            """Pumps audio frames from input channel to VAD and buffers speech."""
            try:
                async for data in self._input_ch:
                    if isinstance(data, rtc.AudioFrame):
                        vad_stream.push_frame(data)
                        if speaking:
                            speech_frames.append(data)
                    elif isinstance(data, self._FlushSentinel):
                        vad_stream.flush()
            except Exception as e:
                logger.debug("Whisper input stream closed: %s", e)
            finally:
                vad_stream.end_input()

        async def _periodic_interim_loop() -> None:
            """Periodically polls speech frames and emits interim transcripts."""
            nonlocal last_interim_text, is_recognizing_interim
            while True:
                await asyncio.sleep(self._interim_interval)
                if not speaking or is_recognizing_interim:
                    continue

                # Buffer must have at least ~300ms of audio (6 frames @ 50ms)
                if len(speech_frames) < 6:
                    continue

                snapshot_frames = list(speech_frames)
                is_recognizing_interim = True
                try:
                    merged = utils.merge_frames(snapshot_frames)
                    wav_bytes = merged.to_wav_bytes()
                    text = await self._stt_instance._transcribe_audio_raw(
                        wav_bytes,
                        language=self._language,
                        session=http_session,
                    )
                    if text and speaking:
                        last_interim_text = text
                        self._event_ch.send_nowait(
                            stt.SpeechEvent(
                                type=stt.SpeechEventType.INTERIM_TRANSCRIPT,
                                alternatives=[
                                    stt.SpeechData(
                                        text=text,
                                        language=LanguageCode(self._language or "en"),
                                    )
                                ],
                            )
                        )
                except Exception as e:
                    logger.debug("Whisper interim recognition skipped: %s", e)
                finally:
                    is_recognizing_interim = False

        async def _vad_consumer() -> None:
            """Monitors VAD events, orchestrating interim and final transcription."""
            nonlocal speaking, speech_frames, last_interim_text
            async for event in vad_stream:
                if event.type == vad.VADEventType.START_OF_SPEECH:
                    speaking = True
                    speech_frames = list(event.frames)
                    last_interim_text = ""
                    self._event_ch.send_nowait(
                        stt.SpeechEvent(
                            type=stt.SpeechEventType.START_OF_SPEECH,
                            alternatives=[
                                stt.SpeechData(
                                    language=LanguageCode(self._language or "en"),
                                    text="",
                                )
                            ],
                        )
                    )
                elif event.type == vad.VADEventType.END_OF_SPEECH:
                    speaking = False
                    # Silero VAD provides the complete user utterance in event.frames
                    final_frames = event.frames if event.frames else list(speech_frames)
                    speech_frames = []

                    final_text = ""
                    if final_frames:
                        try:
                            merged = utils.merge_frames(final_frames)
                            wav_bytes = merged.to_wav_bytes()
                            final_text = await self._stt_instance._transcribe_audio_raw(
                                wav_bytes,
                                language=self._language,
                                session=http_session,
                            )
                        except Exception as e:
                            logger.error("Whisper final STT recognition failed: %s", e)

                    if not final_text and last_interim_text:
                        final_text = last_interim_text

                    if final_text:
                        logger.info(
                            "Silero VAD END_OF_SPEECH, emitting FINAL_TRANSCRIPT: %s",
                            final_text,
                        )
                        self._event_ch.send_nowait(
                            stt.SpeechEvent(
                                type=stt.SpeechEventType.FINAL_TRANSCRIPT,
                                alternatives=[
                                    stt.SpeechData(
                                        language=LanguageCode(self._language or "en"),
                                        text=final_text,
                                    )
                                ],
                            )
                        )

                    self._event_ch.send_nowait(
                        stt.SpeechEvent(
                            type=stt.SpeechEventType.END_OF_SPEECH,
                            alternatives=[
                                stt.SpeechData(
                                    language=LanguageCode(self._language or "en"),
                                    text="",
                                )
                            ],
                        )
                    )
                    last_interim_text = ""

        forward_task = asyncio.create_task(_forward_input(), name="whisper_forward")
        vad_task = asyncio.create_task(_vad_consumer(), name="whisper_vad")
        interim_task = asyncio.create_task(
            _periodic_interim_loop(), name="whisper_interim"
        )

        try:
            # Run forward input and VAD consumer concurrently until input stream closes
            await asyncio.gather(forward_task, vad_task)
        finally:
            interim_task.cancel()
            forward_task.cancel()
            vad_task.cancel()
            await asyncio.gather(
                forward_task, vad_task, interim_task, return_exceptions=True
            )
            await vad_stream.aclose()
            await http_session.close()
