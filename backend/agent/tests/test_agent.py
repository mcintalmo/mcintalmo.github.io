from typing import Any

import pytest
from livekit.agents import AgentSession
from livekit.agents.voice.run_result import RunResult
from livekit.plugins import openai

from agent.main import Assistant, LlmSettings


@pytest.mark.asyncio
async def test_assistant_greeting() -> None:
    # Only run this test if an API key is available, else we mock/skip
    # We'll use the default LlmSettings to get the configuration
    settings = LlmSettings()

    # Check if the API key is actually set, otherwise skip
    if not settings.api_key:
        pytest.skip(
            "NVIDIA_API_KEY or LLM API key is not set, skipping LLM evaluation test."
        )

    llm = openai.LLM(
        model=settings.model,
        base_url=settings.base_url,
        api_key=settings.api_key,
    )

    # We test the basic session start and run logic
    async with AgentSession(llm=llm) as session:
        await session.start(Assistant())

        result: RunResult[Any] = await session.run(user_input="Hello")

        # Test that the agent responds with a message
        result.expect.next_event().is_message(role="assistant")
        result.expect.no_more_events()
