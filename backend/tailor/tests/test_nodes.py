from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import AIMessage
from langchain_core.runnables import RunnableLambda

from tailor.nodes import (
    evaluate_resume,
    ingest_job_description,
    rewrite_resume,
    trim_resume,
)
from tailor.schema import TailorState


@pytest.mark.asyncio
async def test_ingest_job_description_text() -> None:
    state: TailorState = {
        "job_description_input": "Software Engineer looking for Python skills"
    }
    result = await ingest_job_description(state)
    assert result["job_description_text"] == (
        "Software Engineer looking for Python skills"
    )


@pytest.mark.asyncio
async def test_ingest_job_description_url() -> None:
    state: TailorState = {"job_description_input": "https://example.com/job"}

    mock_response = MagicMock()
    mock_response.text = (
        "<html><body><h1>Software Engineer</h1><script>ignore</script></body></html>"
    )
    mock_response.raise_for_status = MagicMock()

    # Mock the get call to return the response asynchronously
    mock_client_instance = AsyncMock()
    mock_client_instance.get.return_value = mock_response

    # Mock the AsyncClient context manager
    mock_client_class = MagicMock()
    mock_client_class.return_value.__aenter__.return_value = mock_client_instance

    with patch("httpx.AsyncClient", new=mock_client_class):
        result = await ingest_job_description(state)
        mock_client_instance.get.assert_called_once_with("https://example.com/job")
        # Script tags should be removed by BeautifulSoup
        assert result["job_description_text"] == "Software Engineer"


@pytest.mark.asyncio
async def test_trim_resume() -> None:
    state: TailorState = {
        "job_description_input": "",
        "job_description_schema": {"title": "Software Engineer"},
        "base_resume": {"basics": {"name": "Test"}},
    }

    mock_llm: RunnableLambda[Any, Any] = RunnableLambda(
        lambda x: AIMessage(content='```json\n{"trimmed": true}\n```')
    )

    with patch("tailor.nodes.get_llm", return_value=mock_llm):
        result = await trim_resume(state)
        assert result["draft_resume"] == {"trimmed": True}


@pytest.mark.asyncio
async def test_rewrite_resume() -> None:
    state: TailorState = {
        "job_description_input": "",
        "job_description_schema": {"title": "Software Engineer"},
        "draft_resume": {"trimmed": True},
    }

    mock_llm: RunnableLambda[Any, Any] = RunnableLambda(
        lambda x: AIMessage(content='{"rewritten": true}')
    )

    with patch("tailor.nodes.get_llm", return_value=mock_llm):
        result = await rewrite_resume(state)
        assert result["final_resume"] == {"rewritten": True}


@pytest.mark.asyncio
async def test_evaluate_resume() -> None:
    state: TailorState = {
        "job_description_input": "",
        "job_description_schema": {"title": "Software Engineer"},
        "final_resume": {"rewritten": True},
    }

    mock_llm: RunnableLambda[Any, Any] = RunnableLambda(
        lambda x: AIMessage(content='{"score": 95}')
    )

    with patch("tailor.nodes.get_llm", return_value=mock_llm):
        result = await evaluate_resume(state)
        assert result["evaluation_score"] == 95
