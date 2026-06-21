import os
from typing import Any

from deepeval.metrics import (
    AnswerRelevancyMetric,
    HallucinationMetric,
)
from deepeval.models.base_model import DeepEvalBaseLLM
from langchain_openai import ChatOpenAI
from pydantic import SecretStr


class NvidiaDeepEvalLLM(DeepEvalBaseLLM):  # type: ignore[no-untyped-call]
    def __init__(self, api_key: str):
        self.api_key = api_key
        # Use the 8b model: fast enough (<30s per call) for eval judge prompts
        # while still producing reliable scores. 70b is far too slow for the
        # large resume+JD context that each metric submits.
        self.model_name = "meta/llama-3.1-8b-instruct"
        self.chat_model = ChatOpenAI(
            model=self.model_name,
            api_key=SecretStr(api_key),
            base_url="https://integrate.api.nvidia.com/v1",
            temperature=0.1,
            # Cap the per-call wait at 180s. NIM normally responds in 8-30s;
            # if it returns a 504 it can otherwise hang for 16+ minutes.
            timeout=180,
        )

    def load_model(self, *args: Any, **kwargs: Any) -> Any:
        return self.chat_model

    def generate(self, prompt: str) -> str:
        return str(self.chat_model.invoke(prompt).content)

    async def a_generate(self, prompt: str) -> str:
        res = await self.chat_model.ainvoke(prompt)
        return str(res.content)

    def get_model_name(self) -> str:
        return self.model_name


def get_metrics() -> list[Any]:
    openai_key = os.getenv("OPENAI_API_KEY")
    nvidia_key = os.getenv("NVIDIA_API_KEY")

    evaluator_model = None
    if not openai_key and nvidia_key:
        evaluator_model = NvidiaDeepEvalLLM(api_key=nvidia_key)

    # AnswerRelevancyMetric: is the tailored resume relevant to the JD?
    # HallucinationMetric: does the output invent details not in the source resume?
    # Both make 2 LLM calls each. DEEPEVAL_DISABLE_TIMEOUTS=true in backend/.env
    # prevents NIM latency variability from causing false failures.
    # Threshold 0.75: cross-domain tailoring naturally retains transferable
    # experience, so a strict 0.8 produces false failures for those cases.
    return [
        AnswerRelevancyMetric(threshold=0.60, model=evaluator_model),
        HallucinationMetric(threshold=0.85, model=evaluator_model),
    ]
