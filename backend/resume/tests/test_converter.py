from pathlib import Path
from typing import Any

import yaml

from resume.converter import convert_json_resume_to_rendercv

REPO_ROOT = Path(__file__).resolve().parents[3]


def test_convert_resume_yaml() -> None:
    source_path = REPO_ROOT / "resume" / "resume.yaml"
    assert source_path.is_file(), f"Missing {source_path}"

    with open(source_path, encoding="utf-8") as f:
        data: dict[str, Any] = yaml.safe_load(f)

    result = convert_json_resume_to_rendercv(data)
    assert "cv" in result
    cv = result["cv"]

    assert cv.get("name") == "Alex McIntosh"
    assert cv.get("email") == "mcintalmo@gmail.com"
    assert "sections" in cv
    sections = cv["sections"]

    assert "experience" in sections
    assert len(sections["experience"]) > 0
    first_job = sections["experience"][0]
    assert first_job["company"] == "Pioneer Management Consulting"
    assert first_job["position"] == "Consultant, Artificial Intelligence"

    assert "education" in sections
    assert "certifications" in sections
    assert "projects" in sections
    assert "summary" in sections
