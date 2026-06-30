import json
from typing import Any

from livekit.agents import RunContext, llm

from common.events import NavigateEvent, NavigationTarget


def make_navigation_tools() -> list[llm.Tool | llm.Toolset]:
    @llm.function_tool(
        description="Navigate the portfolio to a specific section. "
        "Call this whenever the user asks to see, view, navigate to, "
        "or show any section of the portfolio, or asks questions about "
        "skills, work experience, education, projects, or contact. "
        "DO NOT call this tool for general greetings or chit-chat."
    )
    async def navigate_to(
        ctx: RunContext[Any],
        target: NavigationTarget,
    ) -> str:
        """Navigate the frontend to a portfolio section.

        Args:
            target: The section to navigate to (e.g. skills, projects,
                work, education, contact).
        """
        target_name = target.replace("-", " ")

        try:
            room = ctx.session.room_io.room
            remote_participants = room.remote_participants
            if remote_participants:
                recipient_identity = list(remote_participants.keys())[0]
                await room.local_participant.perform_rpc(
                    destination_identity=recipient_identity,
                    method="navigate_to",
                    payload=json.dumps({"target": target}),
                )
            else:
                event = NavigateEvent(target=target)
                await room.local_participant.publish_data(
                    json.dumps(event.model_dump()).encode(),
                    reliable=True,
                )
        except (RuntimeError, AttributeError, Exception):
            # Gracefully handle console mode where AgentSession lacks a room connection
            pass
        return f"Successfully navigated to the {target_name} section"

    return [navigate_to]
