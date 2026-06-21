import asyncio
import datetime
import json
import os
from pathlib import Path
from typing import Any, cast

import pytest
import yaml
from deepeval import assert_test  # type: ignore[attr-defined]
from deepeval.dataset import EvaluationDataset, Golden
from deepeval.test_case import LLMTestCase
from dotenv import load_dotenv

from tailor.schema import TailorState

from .metrics import get_metrics

# Load environment variables from backend/.env
env_path = Path(__file__).parents[3] / ".env"
load_dotenv(dotenv_path=env_path)

# Load dataset relative to this file
current_dir = Path(__file__).parent
dataset_path = current_dir / ".dataset.json"

dataset = EvaluationDataset()
dataset.add_goldens_from_json_file(file_path=str(dataset_path))


def validate_json_resume_structure(data: dict[str, Any]) -> None:
    """Validate that the output dict matches basic JSON resume structure."""
    assert isinstance(data, dict), "Resume must be a JSON object"
    assert "basics" in data, "Resume must contain 'basics' section"
    assert isinstance(data["basics"], dict), "basics must be an object"
    assert "name" in data["basics"], "basics must contain 'name'"

    for section in ["work", "education", "projects", "skills"]:
        if section in data:
            assert isinstance(data[section], list), (
                f"'{section}' section must be a list"
            )


def stringify_dates(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {k: stringify_dates(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [stringify_dates(x) for x in obj]
    if isinstance(obj, (datetime.date, datetime.datetime)):
        return obj.isoformat()
    return obj


@pytest.mark.eval
@pytest.mark.parametrize("golden", dataset.goldens)
def test_tailor_pipeline_eval(golden: Golden) -> None:
    # Skip if API keys are not configured, to avoid breaking local fast tests
    if not os.getenv("NVIDIA_API_KEY"):
        pytest.skip("NVIDIA_API_KEY not set")

    # 1. Compile a test-specific graph that stops at rewrite_resume
    from langgraph.graph import END, START, StateGraph

    from tailor.nodes import (
        extract_schema,
        ingest_job_description,
        rewrite_resume,
        trim_resume,
    )

    workflow = StateGraph(TailorState)
    workflow.add_node("ingest_job_description", ingest_job_description)
    workflow.add_node("extract_schema", extract_schema)
    workflow.add_node("trim_resume", trim_resume)
    workflow.add_node("rewrite_resume", rewrite_resume)

    workflow.add_edge(START, "ingest_job_description")
    workflow.add_edge("ingest_job_description", "extract_schema")
    workflow.add_edge("extract_schema", "trim_resume")
    workflow.add_edge("trim_resume", "rewrite_resume")
    workflow.add_edge("rewrite_resume", END)

    graph = workflow.compile()

    # Load actual production resume dynamically
    repo_root = Path(__file__).parents[4]
    resume_path = repo_root / "resume" / "resume.yaml"
    if not resume_path.exists():
        pytest.fail(f"Production resume not found at {resume_path}")

    def read_yaml() -> dict[str, Any]:
        with open(resume_path, encoding="utf-8") as f:
            res = yaml.safe_load(f)
            assert isinstance(res, dict)
            return cast(dict[str, Any], stringify_dates(res))

    base_resume_data = read_yaml()

    initial_state: TailorState = {
        "job_description_input": golden.input,
        "base_resume": base_resume_data,
    }

    # 2. Run Pipeline
    # Using 'final_resume' node as our main result to evaluate.
    state = asyncio.run(graph.ainvoke(initial_state))  # 3. Grab the generated message
    final_resume = state.get("final_resume", {})

    # Pre-eval structure validation
    validate_json_resume_structure(final_resume)

    actual_resume_text = json.dumps(final_resume)

    # Update Golden with Actual Output and retrieval context for
    # faithfulness/hallucination
    golden.actual_output = actual_resume_text
    golden.retrieval_context = [json.dumps(base_resume_data)]

    # 4. Use LLM as a judge to verify intent and output
    # (Timeout is configured inside get_metrics() before metric instantiation.
    # LLM judge calls are skipped in local tests to prevent timeout issues.)
    if os.getenv("DEEPEVAL_RUN") == "true" or os.getenv("RUN_EVALS") == "true":
        test_case = LLMTestCase(
            input=golden.input,
            actual_output=actual_resume_text,
            retrieval_context=[json.dumps(base_resume_data)],
            context=[json.dumps(base_resume_data)],
        )
        for metric in get_metrics():
            assert_test(test_case=test_case, metrics=[metric])


@pytest.mark.eval
@pytest.mark.parametrize("golden", dataset.goldens)
def test_tailor_pipeline_full(golden: Golden) -> None:
    if os.getenv("RUN_FULL_PIPELINE") != "true":
        pytest.skip("RUN_FULL_PIPELINE is not set to true")
    if not os.getenv("NVIDIA_API_KEY"):
        pytest.skip("NVIDIA_API_KEY not set")

    from tailor.graph import create_graph

    graph = create_graph()

    # Load actual production resume dynamically
    repo_root = Path(__file__).parents[4]
    resume_path = repo_root / "resume" / "resume.yaml"
    if not resume_path.exists():
        pytest.fail(f"Production resume not found at {resume_path}")

    def read_yaml() -> dict[str, Any]:
        with open(resume_path, encoding="utf-8") as f:
            res = yaml.safe_load(f)
            assert isinstance(res, dict)
            return cast(dict[str, Any], stringify_dates(res))

    base_resume_data = read_yaml()

    initial_state: TailorState = {
        "job_description_input": golden.input,
        "base_resume": base_resume_data,
    }

    state = asyncio.run(graph.ainvoke(initial_state))
    final_resume = state.get("final_resume", {})
    validate_json_resume_structure(final_resume)

    assert "evaluation_score" in state, (
        "evaluation_score must be computed in full pipeline"
    )
    assert "output_dir" in state, "output_dir must be populated in full pipeline"
    assert Path(state["output_dir"]).exists(), "output_dir must exist on filesystem"
