from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

import pytest
from livekit import rtc
from livekit.agents import stt
from livekit.agents.types import DEFAULT_API_CONNECT_OPTIONS
from livekit.plugins import silero

from agent.whisper_stt import WhisperSpeechStream, WhisperSTT


@pytest.mark.asyncio
async def test_whisper_stt_capabilities() -> None:
    vad = silero.VAD.load()
    client = WhisperSTT(vad=vad)
    assert client.capabilities.streaming is True
    assert client.capabilities.interim_results is True
    assert client.capabilities.offline_recognize is True
    assert client.model == "Systran/faster-whisper-tiny.en"
    assert client.provider == "whisper-stream"


@pytest.mark.asyncio
async def test_whisper_stt_recognize_impl() -> None:
    vad = silero.VAD.load()
    client = WhisperSTT(vad=vad)
    dummy_frame = rtc.AudioFrame.create(16000, 1, 160)

    with patch.object(
        client, "_transcribe_audio_raw", new_callable=AsyncMock
    ) as mock_transcribe:
        mock_transcribe.return_value = "Hello world"
        event = await client._recognize_impl(
            dummy_frame,
            conn_options=DEFAULT_API_CONNECT_OPTIONS,
        )

        assert event.type == stt.SpeechEventType.FINAL_TRANSCRIPT
        assert len(event.alternatives) == 1
        assert event.alternatives[0].text == "Hello world"
        assert event.alternatives[0].language == "en"
        mock_transcribe.assert_called_once()


@pytest.mark.asyncio
async def test_whisper_speech_stream_lifecycle() -> None:
    vad = silero.VAD.load()
    client = WhisperSTT(vad=vad)
    stream = client.stream()
    assert isinstance(stream, WhisperSpeechStream)

    events: list[stt.SpeechEvent] = []

    async def collect_events() -> None:
        async for ev in stream:
            events.append(ev)

    collector_task = asyncio.create_task(collect_events())

    # Mock _transcribe_audio_raw so test is self-contained without requiring network
    with patch.object(
        client, "_transcribe_audio_raw", new_callable=AsyncMock
    ) as mock_transcribe:
        mock_transcribe.return_value = "Test transcript"

        # Push 10 frames of silence, then end input
        silence_bytes = b"\x00" * 1600
        for _ in range(10):
            frame = rtc.AudioFrame(
                data=silence_bytes,
                sample_rate=16000,
                num_channels=1,
                samples_per_channel=800,
            )
            stream.push_frame(frame)
            await asyncio.sleep(0.01)

        stream.end_input()
        await stream.aclose()

    await asyncio.gather(collector_task, return_exceptions=True)


@pytest.mark.asyncio
async def test_whisper_speech_stream_progressive_events() -> None:
    client = WhisperSTT(vad=None, interim_interval=0.01)

    dummy_frame = rtc.AudioFrame.create(16000, 1, 160)

    class MockVADStream:
        def __init__(self) -> None:
            self._ch = asyncio.Queue()

        def push_frame(self, frame: rtc.AudioFrame) -> None:
            pass

        def flush(self) -> None:
            pass

        def end_input(self) -> None:
            pass

        async def aclose(self) -> None:
            pass

        def __aiter__(self):
            return self

        async def __anext__(self):
            item = await self._ch.get()
            if item is None:
                raise StopAsyncIteration
            return item

    from unittest.mock import Mock

    mock_stream = MockVADStream()
    mock_vad = Mock()
    mock_vad.stream.return_value = mock_stream
    client._vad = mock_vad

    stream = client.stream()
    events: list[stt.SpeechEvent] = []

    async def collect_events() -> None:
        async for ev in stream:
            events.append(ev)

    collector_task = asyncio.create_task(collect_events())

    with patch.object(
        client, "_transcribe_audio_raw", new_callable=AsyncMock
    ) as mock_transcribe:
        mock_transcribe.return_value = "Hello Alex"

        # Simulate VAD start of speech
        from livekit.agents.vad import VADEvent, VADEventType

        await mock_stream._ch.put(
            VADEvent(
                type=VADEventType.START_OF_SPEECH,
                samples_index=0,
                timestamp=0.0,
                silence_duration=0.0,
                speech_duration=0.1,
                frames=[dummy_frame],
                speaking=True,
            )
        )

        # Allow start of speech to process
        await asyncio.sleep(0.05)

        # Simulate VAD end of speech
        await mock_stream._ch.put(
            VADEvent(
                type=VADEventType.END_OF_SPEECH,
                samples_index=1600,
                timestamp=0.1,
                silence_duration=0.5,
                speech_duration=1.0,
                frames=[dummy_frame],
                speaking=False,
            )
        )

        await asyncio.sleep(0.05)
        await mock_stream._ch.put(None)
        stream.end_input()
        await stream.aclose()

    await asyncio.gather(collector_task, return_exceptions=True)
    event_types = [ev.type for ev in events]
    assert stt.SpeechEventType.START_OF_SPEECH in event_types
    assert stt.SpeechEventType.FINAL_TRANSCRIPT in event_types
    assert stt.SpeechEventType.END_OF_SPEECH in event_types
