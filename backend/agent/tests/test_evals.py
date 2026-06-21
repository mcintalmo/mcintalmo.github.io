from typing import Any

import pytest
from livekit.agents import AgentSession
from livekit.agents.voice.run_result import RunResult
from livekit.plugins import openai

from agent.main import Assistant, LlmSettings


@pytest.mark.eval
@pytest.mark.asyncio
async def test_voice_agent_greeting() -> None:
    import os

    if os.getenv("DEEPEVAL_RUN") != "true" and os.getenv("RUN_EVALS") != "true":
        pytest.skip(
            "Skipping LLM evaluation test unless DEEPEVAL_RUN or RUN_EVALS is true."
        )

    settings = LlmSettings()
    if not settings.api_key:
        pytest.skip(
            "NVIDIA_API_KEY or LLM API key is not set, skipping LLM evaluation test."
        )

    llm = openai.LLM(
        model=settings.model,
        base_url=settings.base_url,
        api_key=settings.api_key,
    )

    async with AgentSession(llm=llm) as session:
        await session.start(Assistant())

        user_input = "Hi there, who are you and what do you do?"
        run_result: RunResult[Any] = await session.run(user_input=user_input)

        # Grab the generated message and evaluate using LLM-as-a-judge
        await (
            run_result.expect.next_event()
            .is_message(role="assistant")
            .judge(
                llm,
                intent=(
                    "The assistant should introduce itself as an AI "
                    "resume builder agent, explain that it helps tailor "
                    "resumes, and use a friendly tone."
                ),
            )
        )

        run_result.expect.no_more_events()
