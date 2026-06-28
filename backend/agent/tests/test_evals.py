import asyncio
import os
from pathlib import Path
from typing import Any

import httpx
import pytest
import yaml
from livekit.agents import AgentSession
from livekit.agents.types import APIConnectOptions
from livekit.agents.voice.agent_session import RunResult, SessionConnectOptions
from livekit.agents.voice.run_result import FunctionCallEvent
from livekit.plugins import openai

from agent.main import Assistant, LlmSettings
from agent.tools import make_navigation_tools


@pytest.mark.eval
@pytest.mark.asyncio
async def test_all_golden_cases() -> None:
    if os.getenv("DEEPEVAL_RUN") != "true" and os.getenv("RUN_EVALS") != "true":
        pytest.skip(
            "Skipping LLM evaluation test unless DEEPEVAL_RUN or RUN_EVALS is true."
        )

    # 1. Load Nvidia API Key for the Judge LLM
    nvidia_api_key = os.getenv("NVIDIA_API_KEY")
    if not nvidia_api_key:
        pytest.skip("NVIDIA_API_KEY is not set, skipping LLM evaluation test.")

    # 2. Load settings for the target agent
    settings = LlmSettings()
    if not settings.api_key:
        pytest.skip("Agent LLM API key is not set, skipping LLM evaluation test.")

    # Check if base_url is accessible
    import socket
    from urllib.parse import urlparse

    parsed = urlparse(settings.base_url)
    try:
        host = parsed.hostname or "localhost"
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        with socket.create_connection((host, port), timeout=2.0):
            pass
    except Exception:
        pytest.skip(
            f"LLM endpoint {settings.base_url} is not accessible, "
            "skipping LLM evaluation test."
        )

    # 3. Initialize model clients
    # Target Agent LLM (pointing directly to Nvidia API to prevent test flakiness)
    agent_llm = openai.LLM(
        model="meta/llama-3.3-70b-instruct",
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=nvidia_api_key,
        timeout=httpx.Timeout(60.0),
    )

    # Nvidia Judge LLM (using high-quality Llama-3.3-70b-instruct)
    judge_llm = openai.LLM(
        model="meta/llama-3.3-70b-instruct",
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=nvidia_api_key,
        timeout=httpx.Timeout(60.0),
    )

    # 4. Load YAML dataset
    yaml_path = Path(__file__).parent / "golden_dataset.yaml"
    if not yaml_path.exists():
        pytest.fail(f"Golden dataset not found at {yaml_path}")

    with open(yaml_path, encoding="utf-8") as f:
        data = yaml.safe_load(f)
        cases = data.get("test_cases", [])

    if not cases:
        pytest.fail("No test cases found in golden_dataset.yaml")

    # Helper function to execute a single test case
    async def run_single_case(case: dict[str, Any]) -> None:
        case_name = case.get("name", "unknown")
        user_input = case.get("user_input", "")
        expected_tool_calls = case.get("expected_tool_calls", [])
        intent = case.get("intent", "")

        print(f"Running evaluation case: {case_name}")

        async with AgentSession(
            llm=agent_llm,
            tools=make_navigation_tools(),
            conn_options=SessionConnectOptions(
                llm_conn_options=APIConnectOptions(max_retry=0, timeout=60.0)
            ),
        ) as session:
            await session.start(Assistant())
            run_result: RunResult[Any] = await session.run(user_input=user_input)

            # Assert 1: Verify expected function/tool calls
            for expected_tool in expected_tool_calls:
                run_result.expect.contains_function_call(
                    name=expected_tool["name"],
                    arguments=expected_tool.get("arguments", {}),
                )

            # If no tool calls were expected, assert none were made
            if not expected_tool_calls:
                for event in run_result.events:
                    if isinstance(event, FunctionCallEvent):
                        pytest.fail(
                            f"Case '{case_name}' expected no tool calls, but "
                            f"agent called: {event.item.name} with "
                            f"{event.item.arguments}"
                        )

            # Assert 2: Evaluate using LLM-as-a-judge
            msg_assert = run_result.expect.next_event(type="message")
            assert msg_assert.event().item.role == "assistant", (
                f"Expected assistant message, got {msg_assert.event().item.role}"
            )
            await msg_assert.judge(judge_llm, intent=intent)

            # Assert 3: Make sure no leftover events remain
            run_result.expect.no_more_events()

        print(f"Case {case_name} PASSED.")

    # 5. Run all test cases sequentially with a cooldown to avoid upstream
    # API rate limits
    for case in cases:
        await run_single_case(case)
        await asyncio.sleep(2.0)
