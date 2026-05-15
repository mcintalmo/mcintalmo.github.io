from livekit.agents import llm
from common.events import NavigateEvent, NavigationTarget
import json

def make_navigation_tools(room: llm.ChatContext):
    @llm.ai_callable(
        description="Navigate the portfolio to a specific section. "
                    "Call this whenever the user asks about or shows interest "
                    "in a section of the portfolio."
    )
    async def navigate_to(
        target: NavigationTarget,
        ctx: llm.FunctionContext,
    ) -> str:
        """Navigate the frontend to a portfolio section."""
        event = NavigateEvent(target=target)
        await ctx.room.local_participant.publish_data(
            json.dumps(event.model_dump()).encode(),
            reliable=True,
        )
        return f"Navigated to {target}"

    return [navigate_to]