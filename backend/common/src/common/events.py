from typing import Literal
from pydantic import BaseModel

NavigationTarget = Literal["hero", "work", "education", "skills", "projects", "blog", "contact"]

class NavigateEvent(BaseModel):
    type: Literal["navigate"] = "navigate"
    target: NavigationTarget

class HighlightEvent(BaseModel):
    type: Literal["highlight"] = "highlight"
    target: NavigationTarget

class ResetEvent(BaseModel):
    type: Literal["reset"] = "reset"

AgentEvent = NavigateEvent | HighlightEvent | ResetEvent