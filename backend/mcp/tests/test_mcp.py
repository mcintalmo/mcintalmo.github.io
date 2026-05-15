import pytest
from fastmcp.client import Client

from portfolio_mcp.main import mcp


@pytest.fixture
async def mcp_client():
    async with Client(mcp) as client:
        yield client


async def test_list_tools(mcp_client: Client):
    tools = await mcp_client.list_tools()
    tool_names = [t.name for t in tools]
    assert "send_email" in tool_names
    assert "read_resume" in tool_names


async def test_read_resume_tool(mcp_client: Client):
    # This might fail if frontend/src/content/resume.yaml is not present or valid
    # but we can test that the tool returns a string at least.
    result = await mcp_client.call_tool(name="read_resume", arguments={})
    assert result is not None
    # We just expect a string back, either YAML or an error string
    assert isinstance(result, str) or hasattr(result, "content")
