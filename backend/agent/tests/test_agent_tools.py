import json
from typing import cast
from unittest.mock import AsyncMock, MagicMock

import pytest
from livekit.agents import RunContext
from livekit.agents.llm import FunctionTool

from agent.tools import make_portfolio_tools


def test_make_portfolio_tools_contains_new_tools():
    """Verify that highlight_text and expand_experience_card are registered."""
    tools = [cast(FunctionTool, t) for t in make_portfolio_tools()]
    tool_names = [t.info.name for t in tools]

    assert "highlight_text" in tool_names
    assert "expand_experience_card" in tool_names


@pytest.mark.asyncio
async def test_highlight_text_tool_execution():
    """Verify highlight_text executes and calls perform_rpc on the room participant."""
    tools = [cast(FunctionTool, t) for t in make_portfolio_tools()]
    highlight_tool = next(t for t in tools if t.info.name == "highlight_text")

    # Mock RunContext and LiveKit session/room objects
    mock_ctx = MagicMock(spec=RunContext)
    mock_room = MagicMock()
    mock_ctx.session.room_io.room = mock_room

    # Mock remote participant and local participant RPC call
    mock_room.remote_participants = {"test-user-identity": MagicMock()}
    mock_local_participant = MagicMock()
    mock_local_participant.perform_rpc = AsyncMock(return_value="success")
    mock_room.local_participant = mock_local_participant

    result = await highlight_tool(mock_ctx, text="Physics")

    assert "Successfully highlighted 'Physics'" in result
    mock_local_participant.perform_rpc.assert_called_once_with(
        destination_identity="test-user-identity",
        method="highlight_text",
        payload=json.dumps({"text": "Physics"}),
    )


@pytest.mark.asyncio
async def test_expand_experience_card_tool_execution():
    """Verify expand_experience_card executes and calls perform_rpc
    on the room participant.
    """
    tools = [cast(FunctionTool, t) for t in make_portfolio_tools()]
    expand_tool = next(t for t in tools if t.info.name == "expand_experience_card")

    # Mock RunContext and LiveKit session/room objects
    mock_ctx = MagicMock(spec=RunContext)
    mock_room = MagicMock()
    mock_ctx.session.room_io.room = mock_room

    # Mock remote participant and local participant RPC call
    mock_room.remote_participants = {"test-user-identity": MagicMock()}
    mock_local_participant = MagicMock()
    mock_local_participant.perform_rpc = AsyncMock(return_value="success")
    mock_room.local_participant = mock_local_participant

    result = await expand_tool(mock_ctx, company="Optum")

    assert "Successfully expanded the experience card for 'Optum'" in result
    mock_local_participant.perform_rpc.assert_called_once_with(
        destination_identity="test-user-identity",
        method="expand_experience_card",
        payload=json.dumps({"company": "Optum"}),
    )
