import asyncio
import logging
from typing import Any

from livekit.agents import AgentSession
from livekit.agents.voice.run_result import RunResult
from livekit.plugins import openai

from agent.main import Assistant, LlmSettings
from agent.tools import make_portfolio_tools

logging.basicConfig(level=logging.INFO)


async def main() -> None:
    settings = LlmSettings()
    if not settings.api_key:
        print("NVIDIA_API_KEY is not set.")
        return

    # Use llama-3.3-70b-instruct which natively supports tool calling on Nvidia NIM
    llm = openai.LLM(
        model="meta/llama-3.3-70b-instruct",
        base_url=settings.base_url,
        api_key=settings.api_key,
    )

    print("Starting AgentSession...")
    async with AgentSession(llm=llm, tools=make_portfolio_tools()) as session:
        await session.start(Assistant())
        print("Running turn: 'Navigate to the projects section'...")
        result: RunResult[Any] = await session.run(
            user_input="Navigate to the projects section"
        )

        print("Awaiting full RunResult...")
        await result

        print("\n--- Events Generated after Await ---")
        for event in result.events:
            print("Event:", type(event), event)
            if hasattr(event, "message"):
                print("  Message:", event.message)
            if hasattr(event, "item"):
                print("  Item:", event.item)


if __name__ == "__main__":
    asyncio.run(main())
