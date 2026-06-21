import logging
import os
from pathlib import Path

import yaml
from livekit.agents import Agent, AgentSession, JobContext, TurnHandlingOptions
from livekit.plugins import openai, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel
from wyoming_plugin import WyomingSTT, WyomingTTS

logger = logging.getLogger("rag-agent")


def load_resume_context() -> str:
    resume_path = Path(__file__).parent / "../../resume/resume.yaml"
    if not resume_path.exists():
        logger.warning(f"Resume not found at {resume_path}")
        return ""
    with resume_path.open() as f:
        golden_resume = yaml.safe_load(f)
    return yaml.dump(golden_resume)


class ResumeAssistant(Agent):
    def __init__(self) -> None:
        instructions = (
            "You are an AI assistant acting on behalf of Alexander McIntosh. "
            "Use the provided YAML resume context to answer questions "
            "securely and accurately, putting him in the best possible light. "
            "Do not hallucinate or provide information outside of the resume. "
            "Try to be polite and concise. Try to keep answers to 2 to 3 "
            "sentences if possible.\n\n"
            f"Resume:\n{load_resume_context()}"
        )
        super().__init__(instructions=instructions)


async def entrypoint(ctx: JobContext):
    await ctx.connect()

    session = AgentSession(
        vad=silero.VAD.load(),
        stt=WyomingSTT(host="wyoming-whisper", port=10020),
        llm=openai.LLM(model=os.environ.get("ADK_MODEL", "gpt-4o")),
        tts=WyomingTTS(host="wyoming-piper", port=10200),
        turn_handling=TurnHandlingOptions(
            turn_detection=MultilingualModel(),
        ),
    )

    await session.start(room=ctx.room, agent=ResumeAssistant())

    logger.info("LiveKit Agent started and connected to room! Triggering greeting...")
    await session.generate_reply(instructions="Greet the user warmly and concisely.")
