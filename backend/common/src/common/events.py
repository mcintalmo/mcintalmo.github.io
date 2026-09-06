import time
from typing import Literal

from pydantic import BaseModel, Field

NavigationTarget = Literal[
    "hero", "work", "education", "skills", "projects", "blog", "contact"
]


class NavigateEvent(BaseModel):
    type: Literal["navigate"] = "navigate"
    target: NavigationTarget


class HighlightEvent(BaseModel):
    type: Literal["highlight"] = "highlight"
    target: NavigationTarget


class ResetEvent(BaseModel):
    type: Literal["reset"] = "reset"


class ToolCallStartedEvent(BaseModel):
    type: Literal["tool_call_started"] = "tool_call_started"
    call_id: str
    tool_name: str
    arguments: str
    timestamp: float = Field(default_factory=lambda: time.time() * 1000)


class ToolCallCompletedEvent(BaseModel):
    type: Literal["tool_call_completed"] = "tool_call_completed"
    call_id: str
    tool_name: str
    result: str
    timestamp: float = Field(default_factory=lambda: time.time() * 1000)


AgentEvent = (
    NavigateEvent
    | HighlightEvent
    | ResetEvent
    | ToolCallStartedEvent
    | ToolCallCompletedEvent
)
