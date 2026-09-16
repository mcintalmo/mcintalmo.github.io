import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Any

import httpx
import pytest
import yaml
from deepeval import assert_test
from deepeval.test_case import LLMTestCase, ToolCall
from livekit.agents import AgentSession, ChatMessage
from livekit.agents.types import APIConnectOptions
from livekit.agents.voice.agent_session import RunResult, SessionConnectOptions
from livekit.agents.voice.run_result import FunctionCallEvent
from livekit.plugins import openai

from agent.main import Assistant, LlmSettings
from agent.tools import make_portfolio_tools

from .metrics import (
    get_answer_relevancy_metric,
    get_eval_judge_llm,
    get_guardrails_metric,
    get_persona_adherence_metric,
    get_tool_correctness_metric,
)


def load_golden_cases() -> list[dict[str, Any]]:
    """Load evaluation test cases from golden_dataset.yaml."""
    yaml_path = Path(__file__).parent / "golden_dataset.yaml"
    if not yaml_path.exists():
        return []
    with open(yaml_path, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data.get("test_cases", [])


logger = logging.getLogger("evals")
GOLDEN_CASES = load_golden_cases()


@pytest.mark.eval
@pytest.mark.asyncio
@pytest.mark.parametrize("case", GOLDEN_CASES, ids=lambda c: str(c.get("name", "")))
async def test_agent_evaluation_case(case: dict[str, Any]) -> None:
    """Evaluate conversational AI agent against a golden test case using DeepEval."""
    if os.getenv("DEEPEVAL_RUN") != "true" and os.getenv("RUN_EVALS") != "true":
        pytest.skip(
            "Skipping LLM evaluation test unless DEEPEVAL_RUN or "
            "RUN_EVALS is set to 'true'."
        )

    # 1. Resolve agent LLM configuration
    agent_settings = LlmSettings()
    openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
    gemini_api_key = os.getenv("GEMINI_API_KEY")

    if openrouter_api_key:
        agent_llm = openai.LLM(
            model=os.getenv("EVAL_AGENT_MODEL", "google/gemini-2.5-flash"),
            base_url="https://openrouter.ai/api/v1",
            api_key=openrouter_api_key,
            timeout=httpx.Timeout(60.0),
            max_completion_tokens=2048,
        )
    elif gemini_api_key:
        agent_llm = openai.LLM(
            model="gemini-2.5-flash",
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            api_key=gemini_api_key,
            timeout=httpx.Timeout(60.0),
        )
    elif agent_settings.api_key and agent_settings.api_key != "local-key":
        agent_llm = openai.LLM(
            model=agent_settings.model,
            base_url=agent_settings.base_url,
            api_key=agent_settings.api_key,
            timeout=httpx.Timeout(60.0),
        )
    else:
        pytest.skip("No valid LLM API key available for agent evaluation.")

    # 2. Resolve judge LLM
    judge_llm = get_eval_judge_llm()
    if judge_llm is None:
        pytest.skip("No evaluation judge model credentials available.")

    # 3. Extract test case specifications
    case_name = case.get("name", "unnamed_case")
    logger.info("Executing evaluation case: %s", case_name)
    category = case.get("category", "general")
    user_input = case.get("user_input", "")
    intent = case.get("intent", "").strip()
    raw_expected_tools = case.get("expected_tools", [])

    expected_tool_calls: list[ToolCall] = [
        ToolCall(
            name=tool["name"],
            input_parameters=tool.get("arguments", {}),
        )
        for tool in raw_expected_tools
    ]

    # 4. Execute turn via LiveKit AgentSession
    actual_tool_calls: list[ToolCall] = []
    actual_output_parts: list[str] = []

    async with AgentSession(
        llm=agent_llm,
        tools=make_portfolio_tools(),
        conn_options=SessionConnectOptions(
            llm_conn_options=APIConnectOptions(max_retry=0, timeout=60.0)
        ),
    ) as session:
        await session.start(Assistant())
        run_result: RunResult[Any] = await session.run(user_input=user_input)

        for event in run_result.events:
            if isinstance(event, FunctionCallEvent):
                params: dict[str, Any] = {}
                if event.item.arguments:
                    try:
                        parsed = json.loads(event.item.arguments)
                        if isinstance(parsed, dict):
                            params = parsed
                    except Exception:
                        params = {"raw": event.item.arguments}
                actual_tool_calls.append(
                    ToolCall(
                        name=event.item.name,
                        input_parameters=params,
                    )
                )
            elif isinstance(event, ChatMessage) and event.role == "assistant":
                if event.text_content:
                    actual_output_parts.append(event.text_content)

    actual_output = " ".join(actual_output_parts).strip()
    if not actual_output:
        actual_output = "[Agent executed actions without spoken text]"

    # 5. Build DeepEval LLMTestCase
    test_case = LLMTestCase(
        input=user_input,
        actual_output=actual_output,
        expected_output=intent,
        tools_called=actual_tool_calls,
        expected_tools=expected_tool_calls,
    )

    # 6. Select category-specific DeepEval metrics
    metrics: list[Any] = [
        get_answer_relevancy_metric(model=judge_llm),
    ]

    # Tool correctness is evaluated when expected tools exist or for chitchat
    if raw_expected_tools or category in ("navigation", "detail_retrieval", "chitchat"):
        metrics.append(get_tool_correctness_metric(model=judge_llm))

    # Category-specific behavioral metrics
    if category == "guardrails":
        metrics.append(get_guardrails_metric(model=judge_llm))
    elif category == "role_persona":
        metrics.append(get_persona_adherence_metric(model=judge_llm))

    # 7. Evaluate and assert against thresholds
    assert_test(test_case=test_case, metrics=metrics)

    # Cooldown to respect upstream API rate limits
    await asyncio.sleep(1.0)
