from typing import Any

from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from .nodes import (
    evaluate_resume,
    extract_schema,
    generate_artifacts,
    ingest_job_description,
    rewrite_resume,
    trim_resume,
)
from .schema import TailorState


def create_graph() -> CompiledStateGraph[Any, Any, Any, Any]:
    workflow = StateGraph(TailorState)  # type: ignore

    workflow.add_node("ingest_job_description", ingest_job_description)
    workflow.add_node("extract_schema", extract_schema)
    workflow.add_node("trim_resume", trim_resume)
    workflow.add_node("rewrite_resume", rewrite_resume)
    workflow.add_node("evaluate_resume", evaluate_resume)
    workflow.add_node("generate_artifacts", generate_artifacts)

    workflow.add_edge(START, "ingest_job_description")
    workflow.add_edge("ingest_job_description", "extract_schema")
    workflow.add_edge("extract_schema", "trim_resume")
    workflow.add_edge("trim_resume", "rewrite_resume")
    workflow.add_edge("rewrite_resume", "evaluate_resume")
    workflow.add_edge("evaluate_resume", "generate_artifacts")
    workflow.add_edge("generate_artifacts", END)

    return workflow.compile()
