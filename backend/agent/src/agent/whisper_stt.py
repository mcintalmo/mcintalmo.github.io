from __future__ import annotations

import asyncio
import json
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

if TYPE_CHECKING:
    from livekit.agents import APIConnectOptions
    from livekit.agents.types import NotGivenOr

logger = logging.getLogger("agent.whisper_stt")


class WhisperSTT(stt.STT):
    """Whisper Speech-to-Text streaming client.

    Connects to a Whisper-compatible server (e.g. Speaches or faster-whisper-server)
    supporting live WebSocket audio streaming and HTTP batch fallbacks.
    Optionally accepts a LiveKit VAD (Silero) for neural end-of-speech detection.
    """

    def __init__(
        self,
        *,
        ws_url: str = "ws://localhost:10300/v1/audio/transcriptions",
        base_url: str = "http://localhost:10300/v1",
        model: str = "Systran/faster-whisper-tiny.en",
        language: str = "en",
        vad: vad.VAD | None = None,
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
        self._vad = vad

    @property
    def model(self) -> str:
        return self._model

    @property
    def provider(self) -> str:
        return "whisper-stream"

    async def _recognize_impl(
        self,
        buffer: utils.AudioBuffer,
        *,
        language: NotGivenOr[str] = NOT_GIVEN,
        conn_options: APIConnectOptions,
    ) -> stt.SpeechEvent:
        try:
            # Combine audio frames and convert to WAV bytes
            frame = rtc.combine_audio_frames(buffer)
            wav_bytes = frame.to_wav_bytes()

            # Prepare multipart form data
            data = aiohttp.FormData()
            data.add_field(
                "file",
                wav_bytes,
                filename="audio.wav",
                content_type="audio/wav",
            )
            data.add_field("model", self._model)
            resolved_lang = language if utils.is_given(language) else self._language
            if resolved_lang:
                data.add_field("language", resolved_lang)
            data.add_field("response_format", "json")

            timeout = aiohttp.ClientTimeout(total=30, connect=conn_options.timeout)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(self._http_url, data=data) as resp:
                    if resp.status != 200:
                        err_text = await resp.text()
                        raise RuntimeError(
                            f"Whisper STT HTTP error {resp.status}: {err_text}"
                        )
                    res_json = await resp.json()
                    text = res_json.get("text", "").strip()

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
            logger.error(f"Whisper STT recognize failed: {e}")
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
        )


class WhisperSpeechStream(stt.SpeechStream):
    def __init__(
        self,
        *,
        stt_instance: WhisperSTT,
        ws_url: str,
        conn_options: APIConnectOptions,
        language: str | None = None,
        vad: vad.VAD | None = None,
    ) -> None:
        super().__init__(stt=stt_instance, conn_options=conn_options, sample_rate=16000)
        self._ws_url = ws_url
        self._language = language
        self._speaking = False
        self._vad = vad
        self._last_text = ""

    async def _run(self) -> None:
        # Construct WebSocket connection URL with parameters
        query_params = []
        if self._stt.model:
            query_params.append(f"model={self._stt.model}")
        if self._language:
            query_params.append(f"language={self._language}")
        query_params.append("response_format=json")
        query_params.append("vad_filter=true")

        url = f"{self._ws_url}?{'&'.join(query_params)}"

        async with aiohttp.ClientSession() as session:
            async with session.ws_connect(url) as ws:
                logger.info(f"Connected to Whisper WebSocket stream: {url}")

                vad_stream = self._vad.stream() if self._vad else None
                tasks = [
                    asyncio.create_task(self._send_loop(ws, vad_stream)),
                    asyncio.create_task(self._recv_loop(ws)),
                ]
                if vad_stream:
                    tasks.append(asyncio.create_task(self._vad_loop(vad_stream)))

                try:
                    await asyncio.gather(*tasks)
                except Exception as e:
                    logger.error(f"Whisper WebSocket stream session error: {e}")
                    raise
                finally:
                    for task in tasks:
                        task.cancel()
                    if vad_stream:
                        await vad_stream.aclose()

    async def _vad_loop(self, vad_stream: vad.VADStream) -> None:
        async for event in vad_stream:
            if event.type == vad.VADEventType.START_OF_SPEECH:
                if not self._speaking:
                    self._speaking = True
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
                if self._speaking:
                    self._speaking = False
                    final_text = self._last_text.strip()
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

    async def _send_loop(
        self,
        ws: aiohttp.ClientWebSocketResponse,
        vad_stream: vad.VADStream | None = None,
    ) -> None:
        # Buffer raw PCM audio data into 100ms chunks to send over WebSocket
        # 16000Hz * 1 channel * 2 bytes/sample (16-bit) = 32000 bytes/sec
        # 100ms chunk = 3200 bytes
        audio_bstream = utils.audio.AudioByteStream(
            sample_rate=16000,
            num_channels=1,
            samples_per_channel=1600,
        )

        try:
            async for data in self._input_ch:
                if isinstance(data, rtc.AudioFrame):
                    if vad_stream:
                        vad_stream.push_frame(data)
                    pcm_bytes = data.data.tobytes()
                    for chunk in audio_bstream.write(pcm_bytes):
                        await ws.send_bytes(chunk.data.tobytes())
                elif isinstance(data, self._FlushSentinel):
                    for chunk in audio_bstream.flush():
                        await ws.send_bytes(chunk.data.tobytes())
        except Exception as e:
            logger.debug(f"Whisper send loop exception: {e}")
        finally:
            try:
                for chunk in audio_bstream.flush():
                    await ws.send_bytes(chunk.data.tobytes())
            except Exception:
                pass

    async def _recv_loop(self, ws: aiohttp.ClientWebSocketResponse) -> None:
        silence_task: asyncio.Task[None] | None = None

        async def _silence_timer() -> None:
            await asyncio.sleep(1.2)
            if self._speaking:
                self._speaking = False
                final_text = self._last_text.strip()
                if final_text:
                    logger.info(
                        "Silence detected, emitting FINAL_TRANSCRIPT: %s", final_text
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

        try:
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    try:
                        data = json.loads(msg.data)
                        text = data.get("text", "").strip()
                        if not text:
                            continue

                        self._last_text = text

                        # Cancel previous silence timer if active
                        if silence_task and not silence_task.done():
                            silence_task.cancel()

                        # Emit START_OF_SPEECH if not already speaking
                        if not self._speaking:
                            self._speaking = True
                            self._event_ch.send_nowait(
                                stt.SpeechEvent(
                                    type=stt.SpeechEventType.START_OF_SPEECH,
                                    alternatives=[
                                        stt.SpeechData(
                                            language=LanguageCode(
                                                self._language or "en"
                                            ),
                                            text="",
                                        )
                                    ],
                                )
                            )

                        # Emit intermediate transcript while user is actively speaking
                        self._event_ch.send_nowait(
                            stt.SpeechEvent(
                                type=stt.SpeechEventType.INTERIM_TRANSCRIPT,
                                alternatives=[
                                    stt.SpeechData(
                                        language=LanguageCode(self._language or "en"),
                                        text=text,
                                    )
                                ],
                            )
                        )

                        # Start 1.2s silence timer fallback if VAD is not active
                        if not self._vad:
                            silence_task = asyncio.create_task(_silence_timer())
                    except Exception as e:
                        logger.error(f"Error parsing Whisper stream message: {e}")
                elif msg.type == aiohttp.WSMsgType.CLOSED:
                    break
        finally:
            if silence_task and not silence_task.done():
                silence_task.cancel()

            if self._speaking:
                self._speaking = False
                final_text = self._last_text.strip()
                if final_text:
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
