"""
agent_context.py

Build a structured context dict from a JSON Resume (loaded from resume.yaml)
for consumption by the voice portfolio agent.

The output is written to:
  backend/agent/src/agent/portfolio_content.json

Schema of the emitted dict is intentionally flat and readable — it's used
directly as the agent's knowledge base via a system prompt.
"""

from __future__ import annotations

from typing import Any


def build_agent_context(
    resume: dict[str, Any], site_config: dict[str, Any]
) -> dict[str, Any]:
    """
    Convert a parsed JSON Resume dict + site-config into a structured agent
    context object.

    Args:
        resume:      Parsed contents of resume/resume.yaml (JSON Resume schema).
        site_config: Parsed contents of site-config.yaml (optional).

    Returns:
        JSON-serialisable dict suitable for the voice agent's knowledge base.
    """
    basics = resume.get("basics", {})
    work = resume.get("work", [])
    education = resume.get("education", [])
    skills_raw = resume.get("skills", [])
    projects = resume.get("projects", [])
    certificates = resume.get("certificates", [])

    return {
        # ── Identity ────────────────────────────────────────────────────────────
        "name": basics.get("name"),
        "label": basics.get("label"),
        "summary": basics.get("summary"),
        "contact": _build_contact(basics),
        # ── Career ──────────────────────────────────────────────────────────────
        "work": [_build_work_entry(w) for w in work],
        "education": [_build_education_entry(e) for e in education],
        # ── Skills (grouped by category) ────────────────────────────────────────
        "skills": _group_skills(skills_raw),
        # ── Portfolio ───────────────────────────────────────────────────────────
        "projects": [_build_project_entry(p) for p in projects],
        "certificates": [_build_certificate_entry(c) for c in certificates],
        # ── Site metadata ────────────────────────────────────────────────────────
        "site": site_config.get("site", {}),
    }


# ── Private helpers ────────────────────────────────────────────────────────────


def _build_contact(basics: dict[str, Any]) -> dict[str, Any]:
    return {
        "email": basics.get("email"),
        "url": basics.get("url"),
        "location": _format_location(basics.get("location", {})),
        "profiles": [
            {
                "network": p.get("network"),
                "url": p.get("url"),
                "username": p.get("username"),
            }
            for p in basics.get("profiles", [])
        ],
    }


def _format_location(loc: dict[str, Any]) -> str | None:
    parts = [loc.get("city"), loc.get("region"), loc.get("countryCode")]
    joined = ", ".join(p for p in parts if p)
    return joined or None


def _build_work_entry(w: dict[str, Any]) -> dict[str, Any]:
    return {
        "company": w.get("name"),
        "position": w.get("position"),
        "location": w.get("location"),
        "start_date": w.get("startDate"),
        "end_date": w.get("endDate"),  # None → "present"
        "summary": w.get("summary") or w.get("description"),
        "highlights": w.get("highlights", []),
        "keywords": w.get("keywords", []),
    }


def _build_education_entry(e: dict[str, Any]) -> dict[str, Any]:
    return {
        "institution": e.get("institution"),
        "degree": e.get("studyType"),
        "area": e.get("area"),
        "end_date": e.get("endDate"),
        "url": e.get("url"),
        "achievements": e.get("achievements", []),
        "courses": e.get("courses", []),
    }


def _group_skills(skills: list[dict[str, Any]]) -> dict[str, list[str]]:
    """Return skills grouped by their first keyword (used as category tag)."""
    groups: dict[str, list[str]] = {}
    for skill in skills:
        category = (skill.get("keywords") or ["Other"])[0]
        groups.setdefault(category, []).append(skill["name"])
    return groups


def _build_project_entry(p: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": p.get("name"),
        "description": p.get("description"),
        "highlights": p.get("highlights", []),
        "keywords": p.get("keywords", []),
        "url": p.get("url"),
        "code_url": p.get("codeUrl"),
        "type": p.get("type"),
    }


def _build_certificate_entry(c: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": c.get("name"),
        "issuer": c.get("issuer"),
        "date": str(c.get("date", "")),
        "url": c.get("url"),
        "keywords": c.get("keywords", []),
    }
