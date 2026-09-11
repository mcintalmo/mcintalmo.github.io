# ruff: noqa: E402
import os

# Initialize OpenTelemetry programmatic auto-instrumentation if endpoint is configured
# This MUST happen before importing any instrumented modules.
if os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT"):
    print(
        "[OTel Diagnostic] Initializing programmatic auto-instrumentation for agent..."
    )
    try:
        from opentelemetry.instrumentation.auto_instrumentation import initialize

        initialize()
        print(
            "[OTel Diagnostic] Programmatic auto-instrumentation for agent "
            "initialized successfully."
        )
    except Exception as e:
        print(
            f"[OTel Diagnostic] Programmatic auto-instrumentation for agent failed: {e}"
        )


import asyncio
import json
import logging
import time
from typing import Any

import httpx
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    ChatMessage,
    ConversationItemAddedEvent,
    JobContext,
    JobProcess,
    TurnHandlingOptions,
    cli,
    llm,
    room_io,
    stt,
)
from livekit.agents.types import APIConnectOptions
from livekit.agents.voice.agent_session import SessionConnectOptions
from livekit.plugins import cartesia, openai, silero
from livekit.plugins.openai.tts import AUDIO_STREAM_MODELS

from agent.config import AgentSessionSettings, LlmSettings
from agent.prompt import get_portfolio_assistant_instructions
from agent.tools import make_portfolio_tools
from agent.whisper_stt import WhisperSTT

__all__ = ["Assistant", "LlmSettings"]

AUDIO_STREAM_MODELS.add("kokoro")

# Patch Python 3.14 multiprocessing ValueError in livekit.agents IPC health check
try:
    from livekit.agents.ipc import inference_proc_executor

    _orig_is_alive = inference_proc_executor.InferenceProcExecutor.is_alive

    def _safe_is_alive(self: Any) -> bool:
        try:
            return _orig_is_alive(self)
        except (ValueError, AttributeError):
            return False

    setattr(inference_proc_executor.InferenceProcExecutor, "is_alive", _safe_is_alive)
except Exception:
    pass

logger = logging.getLogger("agent")


class Assistant(Agent):
    def __init__(self, is_voice: bool = True) -> None:
        super().__init__(instructions=get_portfolio_assistant_instructions())


def prewarm(proc: JobProcess) -> None:
    proc.userdata["vad"] = silero.VAD.load()


server = AgentServer(setup_fnc=prewarm, num_idle_processes=3)
app = server


@server.rtc_session(agent_name="portfolio-agent")
async def portfolio_agent(ctx: JobContext) -> None:
    # Logging setup
    # Add any other context you want in all log entries here
    settings = AgentSessionSettings()
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }
    if settings.tts_provider == "cartesia" and settings.cartesia_tts.api_key:
        tts = cartesia.TTS(
            model=settings.cartesia_tts.model,
            voice=settings.cartesia_tts.voice,
            language=settings.cartesia_tts.language,
            api_key=settings.cartesia_tts.api_key,
        )
        logger.info("Using Cartesia TTS (model=%s)", settings.cartesia_tts.model)
    else:
        tts = openai.TTS(
            model=settings.tts.model,
            base_url=settings.tts.base_url,
            api_key=settings.tts.api_key,
            voice=settings.tts.voice,
            response_format=settings.tts.response_format,
        )
        logger.info("Using self-hosted TTS (model=%s)", settings.tts.model)

    turn_handling = TurnHandlingOptions(
        preemptive_generation={
            "enabled": True,
            "preemptive_tts": True,
        },
    )

    if settings.stt_provider == "whisper-stream":
        logger.info(
            "Initializing Whisper streaming STT (with Silero VAD) at %s",
            settings.stt.ws_url,
        )
        stt_instance: stt.STT = WhisperSTT(
            ws_url=settings.stt.ws_url,
            base_url=settings.stt.base_url,
            model=settings.stt.model,
            vad=ctx.proc.userdata["vad"],
        )
    else:
        logger.info("Initializing batch Whisper STT (StreamAdapter)")
        stt_instance = stt.StreamAdapter(
            stt=openai.STT(
                model=settings.stt.model,
                base_url=settings.stt.base_url,
                api_key=settings.stt.api_key,
            ),
            vad=ctx.proc.userdata["vad"],
        )

    session: AgentSession[Any] = AgentSession(
        vad=ctx.proc.userdata["vad"],
        stt=stt_instance,
        llm=openai.LLM(
            model=settings.llm.model,
            base_url=settings.llm.base_url,
            api_key=settings.llm.api_key,
            timeout=httpx.Timeout(60.0),
        ),
        tts=tts,
        turn_handling=turn_handling,
        tools=make_portfolio_tools(),
        max_tool_steps=1,
        conn_options=SessionConnectOptions(
            llm_conn_options=APIConnectOptions(max_retry=0, timeout=60.0)
        ),
    )

    @session.on("close")
    def on_session_close() -> None:
        logger.debug("AgentSession closed, shutting down JobContext")
        ctx.shutdown(reason="session closed")

    @session.on("conversation_item_added")
    def on_conversation_item_added(ev: ConversationItemAddedEvent) -> None:
        item = ev.item
        if isinstance(item, ChatMessage) and item.role == "assistant":
            text = item.text_content
            if text:

                async def send_chat() -> None:
                    try:
                        # 1. Send via native text stream (topic="lk-chat-topic")
                        await ctx.room.local_participant.send_text(
                            text,
                            topic="lk-chat-topic",
                        )
                        # 2. Publish JSON data packet for LiveKit useChat hook
                        chat_pkt = json.dumps(
                            {
                                "id": f"asst-{time.time()}",
                                "message": text,
                                "timestamp": int(time.time() * 1000),
                            }
                        )
                        await ctx.room.local_participant.publish_data(
                            chat_pkt.encode("utf-8"),
                            reliable=True,
                            topic="lk-chat-topic",
                        )
                    except Exception as e:
                        logger.error(f"Failed to send text to lk-chat-topic: {e}")

                asyncio.create_task(send_chat())

                async def generate_and_send_followups() -> None:
                    try:
                        # Construct a temporary ChatContext containing history
                        llm_ctx = llm.ChatContext.empty()
                        system_prompt = (
                            "You are a helpful assistant. Based on the "
                            "conversation history below, generate exactly "
                            "three follow-up questions that the user might "
                            "want to ask next. The questions should be "
                            "natural, brief, and highly relevant to Alex "
                            "McIntosh's professional background. Respond "
                            "ONLY with a JSON object containing a "
                            "'questions' key with a list of objects, each "
                            "containing 'title' (a short 2-4 word "
                            "abbreviation/label for a button, e.g., "
                            "'ML Experience') and 'prompt' (the full "
                            "question to send, e.g., 'What is Alex's "
                            "ML experience?'), for example:\n"
                            '{"questions": [{"title": "ML Experience", '
                            '"prompt": "What is Alex\'s ML experience?"}, '
                            '{"title": "Contact info", "prompt": '
                            '"How can I contact Alex?"}, {"title": '
                            '"Education", "prompt": "Where did Alex study?"}]}'
                            "\nDo not include any other markdown formatting, "
                            "code block ticks, or commentary."
                        )
                        llm_ctx.add_message(
                            role="system",
                            content=system_prompt,
                        )
                        if not isinstance(session.llm, llm.LLM):
                            logger.error(
                                "session.llm is not a standard LLM instance, "
                                "cannot generate followups"
                            )
                            return

                        # Add last few messages for context
                        messages = session.history.messages()
                        for msg in messages[-6:]:
                            if msg.role == "system" or not msg.text_content:
                                continue
                            llm_ctx.add_message(role=msg.role, content=msg.text_content)

                        # Call LLM manually using session.llm
                        chat_response = await session.llm.chat(
                            chat_ctx=llm_ctx
                        ).collect()
                        content = chat_response.text
                        if content:
                            clean_content = content.strip()
                            if clean_content.startswith("```"):
                                lines = clean_content.splitlines()
                                if len(lines) > 2:
                                    clean_content = "\n".join(lines[1:-1]).strip()

                            parsed = json.loads(clean_content)
                            if isinstance(parsed, dict) and "questions" in parsed:
                                # Publish via data channel using publish_data
                                await ctx.room.local_participant.publish_data(
                                    json.dumps(parsed).encode("utf-8"),
                                    reliable=True,
                                    topic="portfolio.followups",
                                )
                                logger.debug("Published followups: %s", clean_content)
                    except Exception as e:
                        logger.error(f"Failed to generate or send followups: {e}")

                asyncio.create_task(generate_and_send_followups())

    _recent_messages: set[str] = set()

    def _process_user_message(text: str, source: str) -> None:
        clean_text = text.strip()
        if not clean_text:
            return
        # Deduplication key within 2-second window
        msg_key = f"{clean_text}:{int(time.time() / 2)}"
        if msg_key in _recent_messages:
            logger.debug(
                "Skipping duplicate user message from %s: %s", source, clean_text
            )
            return
        _recent_messages.add(msg_key)
        if len(_recent_messages) > 100:
            _recent_messages.clear()

        logger.info("Processing user message from %s: %s", source, clean_text)
        session.interrupt()
        session.generate_reply(user_input=clean_text)

    async def on_text_input(
        session: AgentSession[Any], event: room_io.TextInputEvent
    ) -> None:
        _process_user_message(event.text, source="text_stream")

    @ctx.room.on("data_received")
    def on_data_received(dp: rtc.DataPacket) -> None:
        try:
            payload = dp.data.decode("utf-8")
            text = payload
            try:
                msg_data = json.loads(payload)
                if isinstance(msg_data, dict):
                    if msg_data.get("type") == "set_chat_mode":
                        mode = msg_data.get("mode", "text")
                        is_voice = mode == "voice"
                        logger.info("Setting chat mode via data packet: mode=%s", mode)
                        session.input.set_audio_enabled(is_voice)
                        session.output.set_audio_enabled(is_voice)
                        return
                    if "message" in msg_data and msg_data["message"]:
                        text = msg_data["message"]
                    elif "text" in msg_data and msg_data["text"]:
                        text = msg_data["text"]
            except Exception:
                pass

            if dp.topic in ("lk.chat", "lk-chat-topic", ""):
                _process_user_message(text, source="data_packet")
        except Exception as e:
            logger.error(f"Failed to process incoming chat data packet: {e}")

    @ctx.room.on("track_published")
    def on_track_published(
        pub: rtc.RemoteTrackPublication, participant: rtc.RemoteParticipant
    ) -> None:
        if pub.kind == rtc.TrackKind.KIND_AUDIO:
            logger.info(
                "Audio track published by %s, enabling audio input for STT",
                participant.identity,
            )
            session.input.set_audio_enabled(True)
            session.output.set_audio_enabled(True)

    await session.start(
        agent=Assistant(),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            text_input=room_io.TextInputOptions(
                text_input_cb=on_text_input,
            ),
        ),
    )

    # Enable audio input & output after session initialization
    if session.input:
        session.input.set_audio_enabled(True)
    if session.output:
        session.output.set_audio_enabled(True)

    # Join the room and connect to the user
    await ctx.connect()

    @ctx.room.local_participant.register_rpc_method("set_chat_mode")
    async def on_set_chat_mode(data: rtc.RpcInvocationData) -> str:
        try:
            payload = json.loads(data.payload)
            mode = payload.get("mode", "text")
            logger.debug("Setting chat mode to %s", mode)
            is_voice = mode == "voice"
            session.input.set_audio_enabled(is_voice)
            session.output.set_audio_enabled(is_voice)
            return json.dumps({"success": True})
        except Exception as e:
            logger.error("Failed to set chat mode: %s", e)
            return json.dumps({"success": False, "error": str(e)})


if __name__ == "__main__":
    cli.run_app(server)
