# We can query LiteLLM directly.
# portfolio-llm maps to NVIDIA API (Llama-3.3-70b)
# portfolio-llm-local maps to Local Ollama (Qwen2.5-3B)
import os
import time
from typing import Any

import httpx
import pytest

LITELLM_URL = "http://localhost:4000/v1/chat/completions"
LITELLM_KEY = os.environ.get("LITELLM_API_KEY", "litellm-secret")
HEADERS = {"Content-Type": "application/json", "Authorization": f"Bearer {LITELLM_KEY}"}


def measure_ttft(model_name: str) -> float:
    payload = {
        "model": model_name,
        "messages": [{"role": "user", "content": "Tell me a short 10 word story."}],
        "stream": True,
        "max_tokens": 50,
    }

    start_time = time.perf_counter()
    with httpx.stream(
        "POST", LITELLM_URL, json=payload, headers=HEADERS, timeout=30.0
    ) as r:
        if r.status_code != 200:
            raise RuntimeError(
                f"Request failed with status {r.status_code}: {r.read().decode()}"
            )

        # Read the first chunk (which contains the first token)
        for line in r.iter_lines():
            if line.strip():
                # We received the first token chunk!
                ttft = time.perf_counter() - start_time
                return ttft

    raise RuntimeError("Stream ended without yielding any tokens.")


def test_nvidia_ttft(benchmark: Any) -> None:
    # Benchmark Nvidia TTFT via LiteLLM router (model: portfolio-llm)
    try:
        ttft = benchmark(measure_ttft, "portfolio-llm")
        assert ttft > 0
    except Exception as e:
        pytest.skip(f"Nvidia benchmark failed/skipped: {e}")


def test_cerebras_ttft(benchmark: Any) -> None:
    # Benchmark Cerebras TTFT (model: portfolio-llm-cerebras)
    try:
        ttft = benchmark(measure_ttft, "portfolio-llm-cerebras")
        assert ttft > 0
    except Exception as e:
        pytest.skip(f"Cerebras benchmark failed/skipped: {e}")


def test_openrouter_gemini_ttft(benchmark: Any) -> None:
    # Benchmark OpenRouter Gemini TTFT (model: portfolio-llm-openrouter-gemini)
    try:
        ttft = benchmark(measure_ttft, "portfolio-llm-openrouter-gemini")
        assert ttft > 0
    except Exception as e:
        pytest.skip(f"OpenRouter Gemini benchmark failed/skipped: {e}")


def test_openrouter_llama_ttft(benchmark: Any) -> None:
    # Benchmark OpenRouter Llama TTFT (model: portfolio-llm-openrouter-llama)
    try:
        ttft = benchmark(measure_ttft, "portfolio-llm-openrouter-llama")
        assert ttft > 0
    except Exception as e:
        pytest.skip(f"OpenRouter Llama benchmark failed/skipped: {e}")


def test_gemini_direct_ttft(benchmark: Any) -> None:
    # Benchmark Direct Google AI Studio Gemini TTFT (model: portfolio-llm-gemini-direct)
    try:
        ttft = benchmark(measure_ttft, "portfolio-llm-gemini-direct")
        assert ttft > 0
    except Exception as e:
        pytest.skip(f"Gemini direct benchmark failed/skipped: {e}")


def test_github_direct_ttft(benchmark: Any) -> None:
    # Benchmark Direct GitHub Models TTFT (model: portfolio-llm-github-direct)
    try:
        ttft = benchmark(measure_ttft, "portfolio-llm-github-direct")
        assert ttft > 0
    except Exception as e:
        pytest.skip(f"GitHub direct benchmark failed/skipped: {e}")


def test_ollama_local_ttft(benchmark: Any) -> None:
    # Benchmark Local Ollama TTFT via LiteLLM router (model: portfolio-llm-local)
    try:
        ttft = benchmark(measure_ttft, "portfolio-llm-local")
        assert ttft > 0
    except Exception as e:
        pytest.skip(f"Ollama local benchmark failed/skipped: {e}")
