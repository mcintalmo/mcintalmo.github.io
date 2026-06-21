from tailor.graph import create_graph


def test_graph_compiles() -> None:
    # create_graph() already returns a CompiledStateGraph
    compiled = create_graph()

    assert compiled is not None
    # Check that nodes are registered correctly
    nodes = compiled.get_graph().nodes

    # Start and End nodes are internal, but let's check for our custom nodes
    node_names = set(nodes.keys())
    assert "ingest_job_description" in node_names
    assert "extract_schema" in node_names
    assert "trim_resume" in node_names
    assert "rewrite_resume" in node_names
    assert "evaluate_resume" in node_names
    assert "generate_artifacts" in node_names
