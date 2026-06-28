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
from livekit.plugins import noise_cancellation, openai, silero
from livekit.plugins.openai.tts import AUDIO_STREAM_MODELS
from livekit.plugins.turn_detector.multilingual import MultilingualModel

from agent.config import AgentSessionSettings, LlmSettings
from agent.prompt import get_portfolio_assistant_instructions
from agent.tools import make_navigation_tools

__all__ = ["Assistant", "LlmSettings"]

AUDIO_STREAM_MODELS.add("kokoro")

logger = logging.getLogger("agent")


class Assistant(Agent):
    def __init__(self, is_voice: bool = True) -> None:
        super().__init__(instructions=get_portfolio_assistant_instructions())


def prewarm(proc: JobProcess) -> None:
    proc.userdata["vad"] = silero.VAD.load()


server = AgentServer(setup_fnc=prewarm)
app = server


@server.rtc_session(agent_name="portfolio-agent")
async def portfolio_agent(ctx: JobContext) -> None:
    # Logging setup
    # Add any other context you want in all log entries here
    settings = AgentSessionSettings()
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }
    tts = openai.TTS(
        model=settings.tts.model,
        base_url=settings.tts.base_url,
        api_key=settings.tts.api_key,
        voice=settings.tts.voice,
        response_format=settings.tts.response_format,
    )

    turn_handling = TurnHandlingOptions(
        turn_detection=MultilingualModel(),
    )

    session: AgentSession[Any] = AgentSession(
        vad=ctx.proc.userdata["vad"],
        stt=stt.StreamAdapter(
            stt=openai.STT(
                model=settings.stt.model,
                base_url=settings.stt.base_url,
                api_key=settings.stt.api_key,
            ),
            vad=ctx.proc.userdata["vad"],
        ),
        llm=openai.LLM(
            model=settings.llm.model,
            base_url=settings.llm.base_url,
            api_key=settings.llm.api_key,
            timeout=httpx.Timeout(60.0),
        ),
        tts=tts,
        turn_handling=turn_handling,
        preemptive_generation=True,
        tools=make_navigation_tools(),
        max_tool_steps=1,
        conn_options=SessionConnectOptions(
            llm_conn_options=APIConnectOptions(max_retry=0, timeout=60.0)
        ),
    )

    session.input.set_audio_enabled(False)
    session.output.set_audio_enabled(False)

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
                        await ctx.room.local_participant.send_text(
                            text,
                            topic="lk.chat",
                        )
                    except Exception as e:
                        logger.error(f"Failed to send text to lk.chat: {e}")

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

    async def on_text_input(
        session: AgentSession[Any], event: room_io.TextInputEvent
    ) -> None:
        logger.debug("Received text chat via text stream (native): %s", event.text)
        await session.interrupt()
        session.generate_reply(user_input=event.text)

    @ctx.room.on("data_received")
    def on_data_received(data_packet: rtc.DataPacket) -> None:
        logger.debug(
            "DATA RECEIVED on room: topic=%s, len=%d",
            data_packet.topic,
            len(data_packet.data),
        )
        if data_packet.topic in ("lk.chat", "lk-chat-topic"):
            try:
                payload = data_packet.data.decode("utf-8")
                text = payload
                try:
                    import json

                    msg_data = json.loads(payload)
                    if isinstance(msg_data, dict):
                        if "text" in msg_data:
                            text = msg_data["text"]
                        elif "message" in msg_data:
                            text = msg_data["message"]
                except Exception:
                    pass

                logger.debug(
                    "Received text chat via data packet (topic=%s): %s",
                    data_packet.topic,
                    text,
                )
                session.interrupt()
                session.generate_reply(user_input=text)
            except Exception as e:
                logger.error(f"Failed to process incoming chat data packet: {e}")

    # Start the session, which initializes the voice pipeline and warms up the models
    import os

    livekit_url = os.environ.get("LIVEKIT_URL", "")
    is_local = (
        "localhost" in livekit_url or "127.0.0.1" in livekit_url or not livekit_url
    )
    nc = None if is_local else noise_cancellation.BVC()

    await session.start(
        agent=Assistant(),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=nc,
            ),
            text_input=room_io.TextInputOptions(
                text_input_cb=on_text_input,
            ),
        ),
    )

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
