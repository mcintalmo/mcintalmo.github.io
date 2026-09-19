import re
from typing import get_args

from common.events import (
    HighlightEvent,
    NavigateEvent,
    NavigationTarget,
    ResetEvent,
    ToolCallCompletedEvent,
    ToolCallStartedEvent,
)
from common.paths import REPO_ROOT


def test_navigation_targets_synchronized() -> None:
    events_ts_path = REPO_ROOT / "frontend" / "src" / "lib" / "events.ts"
    assert events_ts_path.is_file(), f"Missing {events_ts_path}"
    content = events_ts_path.read_text(encoding="utf-8")

    # Extract NavigationTarget options from TypeScript
    match = re.search(r"export type NavigationTarget =([^;]+);", content)
    assert match is not None, "Could not find NavigationTarget in events.ts"

    ts_targets = set(re.findall(r'"([^"]+)"', match.group(1)))
    py_targets = set(get_args(NavigationTarget))

    assert py_targets == ts_targets, (
        f"NavigationTarget mismatch: Python has {py_targets}, TS has {ts_targets}"
    )


def test_event_schemas_synchronized() -> None:
    events_ts_path = REPO_ROOT / "frontend" / "src" / "lib" / "events.ts"
    content = events_ts_path.read_text(encoding="utf-8")

    # Verify each event type is present in TS
    event_classes = [
        NavigateEvent,
        HighlightEvent,
        ResetEvent,
        ToolCallStartedEvent,
        ToolCallCompletedEvent,
    ]

    for cls in event_classes:
        # Default value of 'type' field
        type_default = cls.model_fields["type"].default
        assert f'type: "{type_default}"' in content, (
            f"Event type '{type_default}' from {cls.__name__} not found in events.ts"
        )

        # Check that all required fields exist in TS definition
        for field_name in cls.model_fields:
            if field_name == "type":
                continue
            assert f"{field_name}:" in content, (
                f"Field '{field_name}' from {cls.__name__} not found in events.ts"
            )
