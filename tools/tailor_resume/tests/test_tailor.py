import copy
import os
import sys

import pytest

# Add parental and mcp_server directories to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../mcp_server"))
)

import server as tailor


@pytest.fixture
def mock_resume():
    return {
        "basics": {"name": "Alexander McIntosh", "summary": "Original summary text."},
        "work": [
            {
                "company": "Company A",
                "position": "Analyst",
                "description": "Original description A.",
            },
            {
                "company": "Company B",
                "position": "Engineer",
                "description": "Original description B.",
            },
        ],
        "skills": [{"name": "Python"}, {"name": "React"}],
    }


def test_update_field_dict(mock_resume):
    tailor.working_resume = copy.deepcopy(mock_resume)

    result = tailor.update_field("basics.summary", "Tailored new summary.")
    assert "Successfully" in result
    assert tailor.working_resume["basics"]["summary"] == "Tailored new summary."


def test_update_field_list(mock_resume):
    tailor.working_resume = copy.deepcopy(mock_resume)

    result = tailor.update_field("work.1.description", "Tailored description B.")
    assert "Successfully" in result
    assert tailor.working_resume["work"][1]["description"] == "Tailored description B."


def test_update_field_invalid_path(mock_resume):
    tailor.working_resume = copy.deepcopy(mock_resume)
    result = tailor.update_field("invalid.path.8", "Fail")
    assert "Error" in result


def test_remove_item_dict(mock_resume):
    tailor.working_resume = copy.deepcopy(mock_resume)

    # Remove a property from a dict
    result = tailor.remove_item("basics.summary")
    assert "Successfully" in result
    assert "summary" not in tailor.working_resume["basics"]


def test_remove_item_list(mock_resume):
    tailor.working_resume = copy.deepcopy(mock_resume)

    # Remove index 0 from skills
    assert len(tailor.working_resume["skills"]) == 2
    result = tailor.remove_item("skills.0")
    assert "Successfully" in result
    assert len(tailor.working_resume["skills"]) == 1
    # Check that the remaining skill shifted up
    assert tailor.working_resume["skills"][0]["name"] == "React"


def test_format_resume(mock_resume):
    tailor.working_resume = copy.deepcopy(mock_resume)
    content = tailor.format_resume("basics.name")
    assert "Alexander McIntosh" in content

    root_str = tailor.format_resume("")
    assert "Company A" in root_str
