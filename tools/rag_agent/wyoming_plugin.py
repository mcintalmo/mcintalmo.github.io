import asyncio
import logging
from typing import Any

from livekit import rtc
from livekit.agents import stt, tts, utils
from wyoming.asr import Transcribe, Transcript
from wyoming.audio import AudioChunk, AudioStart, AudioStop
from wyoming.client import AsyncTcpClient
from wyoming.tts import Synthesize

logger = logging.getLogger("wyoming-plugin")


class WyomingSTTStream(stt.SpeechStream):
    def __init__(
        self, *, stt_obj: stt.STT, conn_options: Any, host: str, port: int
    ):
        super().__init__(stt=stt_obj, conn_options=conn_options)
        self.host = host
        self.port = port
        self._queue = asyncio.Queue()
        self._event_queue = asyncio.Queue()
        self._task = asyncio.create_task(self._run())

    def push_frame(self, frame: rtc.AudioFrame) -> None:
        self._queue.put_nowait(frame)

    async def flush(self) -> None:
        pass

    async def end_input(self) -> None:
        self._queue.put_nowait(None)

    async def aclose(self, *, wait: bool = True) -> None:
        if not wait:
            self._task.cancel()
        else:
            self._queue.put_nowait(None)
        await self._task

    async def __anext__(self) -> stt.SpeechEvent:
        event = await self._event_queue.get()
        if event is None:
            raise StopAsyncIteration
        return event

    def __aiter__(self):
        return self

    async def _run(self):
        client = AsyncTcpClient(self.host, self.port)
        await client.connect()
        await client.write_event(Transcribe(language="en").event())

        async def _read_events():
            while True:
                event = await client.read_event()
                if event is None:
                    break
                if Transcript.is_type(event.type):
                    transcript = Transcript.from_event(event)
                    self._event_queue.put_nowait(
                        stt.SpeechEvent(
                            type=stt.SpeechEventType.FINAL_TRANSCRIPT,
                            alternatives=[
                                stt.SpeechData(
                                    language="en", text=transcript.text
                                )
                            ],
                        ),
                    )
                    break

        read_task = asyncio.create_task(_read_events())

        try:
            first_frame = True
            while True:
                frame = await self._queue.get()
                if frame is None:
                    break

                if first_frame:
                    await client.write_event(
                        AudioStart(
                            rate=frame.sample_rate,
                            width=2,
                            channels=frame.num_channels,
                        ).event(),
                    )
                    first_frame = False

                chunk = AudioChunk(
                    rate=frame.sample_rate,
                    width=2,
                    channels=frame.num_channels,
                    audio=frame.data.tobytes(),
                )
                await client.write_event(chunk.event())

        finally:
            await client.write_event(AudioStop().event())
            await read_task
            await client.disconnect()
            self._event_queue.put_nowait(None)


class WyomingSTT(stt.STT):
    def __init__(self, host: str = "wyoming-whisper", port: int = 10020):
        super().__init__(
            capabilities=stt.STTCapabilities(
                streaming=True, interim_results=False
            ),
        )
        self.host = host
        self.port = port

    def stream(self, **kwargs) -> WyomingSTTStream:
        return WyomingSTTStream(
            stt_obj=self,
            conn_options=kwargs.get("conn_options"),
            host=self.host,
            port=self.port,
        )

    async def _recognize_impl(
        self, frame: rtc.AudioFrame, *, language: str | None = None
    ) -> stt.SpeechEvent:
        raise NotImplementedError(
            "Batch recognition is not supported by WyomingSTT"
        )


class WyomingTTSChunkedStream(tts.ChunkedStream):
    def __init__(
        self,
        *,
        tts_obj: tts.TTS,
        text: str,
        conn_options: Any,
        host: str,
        port: int,
    ):
        super().__init__(
            tts=tts_obj, input_text=text, conn_options=conn_options
        )
        self.text = text
        self.host = host
        self.port = port
        self._event_queue = asyncio.Queue()
        self._task = asyncio.create_task(self._run())

    async def __anext__(self) -> tts.SynthesizedAudio:
        event = await self._event_queue.get()
        if event is None:
            raise StopAsyncIteration
        return event

    def __aiter__(self):
        return self

    async def _run(self):
        client = AsyncTcpClient(self.host, self.port)
        await client.connect()
        try:
            await client.write_event(Synthesize(text=self.text).event())
            request_id = utils.shortuuid()

            while True:
                event = await client.read_event()
                if event is None:
                    break

                if AudioChunk.is_type(event.type):
                    chunk = AudioChunk.from_event(event)
                    audio_frame = rtc.AudioFrame(
                        data=chunk.audio,
                        sample_rate=chunk.rate,
                        num_channels=chunk.channels,
                        samples_per_channel=len(chunk.audio)
                        // (2 * chunk.channels),
                    )
                    self._event_queue.put_nowait(
                        tts.SynthesizedAudio(
                            request_id=request_id,
                            frame=audio_frame,
                        ),
                    )
                elif AudioStop.is_type(event.type):
                    break
        finally:
            await client.disconnect()
            self._event_queue.put_nowait(None)


class WyomingTTS(tts.TTS):
    def __init__(self, host: str = "wyoming-piper", port: int = 10200):
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False),
            sample_rate=22050,
            num_channels=1,
        )
        self.host = host
        self.port = port

    def synthesize(self, text: str, **kwargs) -> WyomingTTSChunkedStream:
        return WyomingTTSChunkedStream(
            tts_obj=self,
            text=text,
            conn_options=kwargs.get("conn_options"),
            host=self.host,
            port=self.port,
        )
