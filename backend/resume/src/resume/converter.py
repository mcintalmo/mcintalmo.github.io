"""Convert JSON Resume (YAML notation) to RenderCV format.

Pure-Python replacement for resume/convert/convert.mjs.
"""

from __future__ import annotations

import datetime
import re
from typing import Any


def location_to_string(loc: dict[str, Any] | None) -> str | None:
    """Format a JSON Resume location dictionary as a compact string."""
    if not loc:
        return None
    parts = [loc.get("city"), loc.get("region"), loc.get("countryCode")]
    valid_parts = [str(p).strip() for p in parts if p and str(p).strip()]
    return ", ".join(valid_parts) if valid_parts else None


def convert_json_resume_to_rendercv(r: dict[str, Any]) -> dict[str, Any]:
    """Convert JSON Resume dictionary into a RenderCV-compatible dictionary.

    Args:
        r: Parsed dictionary following JSON Resume schema.

    Returns:
        RenderCV-compatible dictionary with 'cv' root.
    """
    basics = r.get("basics", {})
    sections: dict[str, Any] = {}

    # ── Summary ───────────────────────────────────────────────────────────────
    if basics.get("summary"):
        sections["summary"] = [basics["summary"]]

    # ── Work Experience ───────────────────────────────────────────────────────
    work = r.get("work", [])
    if work:
        experience_entries: list[dict[str, Any]] = []
        for w in work:
            entry: dict[str, Any] = {
                "company": w.get("name", ""),
                "position": w.get("position", ""),
            }
            if w.get("location"):
                entry["location"] = w["location"]
            if w.get("startDate"):
                entry["start_date"] = w["startDate"]
            if w.get("endDate"):
                entry["end_date"] = w["endDate"]
            else:
                entry["end_date"] = "present"

            if w.get("summary"):
                entry["summary"] = w["summary"]
            elif w.get("description"):
                entry["summary"] = w["description"]

            if w.get("highlights"):
                entry["highlights"] = w["highlights"]

            experience_entries.append(entry)
        sections["experience"] = experience_entries

    # ── Education ─────────────────────────────────────────────────────────────
    education = r.get("education", [])
    if education:
        education_entries: list[dict[str, Any]] = []
        for e in education:
            entry = {
                "institution": e.get("institution", ""),
                "area": e.get("area", ""),
                "degree": e.get("studyType", ""),
            }
            if e.get("url"):
                entry["url"] = e["url"]
            if e.get("startDate"):
                entry["start_date"] = e["startDate"]
            if e.get("endDate"):
                entry["end_date"] = e["endDate"]

            highlights: list[str] = []
            if e.get("achievements"):
                highlights.extend(e["achievements"])
            if e.get("courses"):
                highlights.extend(e["courses"])
            if highlights:
                entry["highlights"] = highlights

            education_entries.append(entry)
        sections["education"] = education_entries

    # ── Certificates ──────────────────────────────────────────────────────────
    certificates = r.get("certificates", [])
    if certificates:
        cert_entries: list[dict[str, Any]] = []
        for c in certificates:
            entry = {"name": c.get("name", "")}
            date_val = c.get("date")
            if date_val:
                if isinstance(date_val, (datetime.date, datetime.datetime)):
                    entry["date"] = date_val.strftime("%Y-%m")
                else:
                    entry["date"] = str(date_val)[:7]

            if c.get("issuer"):
                entry["location"] = c["issuer"]
            if c.get("url"):
                entry["url"] = c["url"]

            cert_entries.append(entry)
        sections["certifications"] = cert_entries

    # ── Projects ──────────────────────────────────────────────────────────────
    projects = r.get("projects", [])
    if projects:
        project_entries: list[dict[str, Any]] = []
        for p in projects:
            entry = {"name": p.get("name", "")}
            if p.get("url"):
                entry["url"] = p["url"]
            if p.get("startDate"):
                entry["date"] = p["startDate"]

            highlights: list[str] = []
            if p.get("description"):
                highlights.append(str(p["description"]).strip())
            if p.get("highlights"):
                highlights.extend(p["highlights"])
            if highlights:
                entry["highlights"] = highlights

            project_entries.append(entry)
        sections["projects"] = project_entries

    # ── Skills (grouped by keywords[0] category tag) ──────────────────────────
    skills = r.get("skills", [])
    if skills:
        by_category: dict[str, list[str]] = {}
        for skill in skills:
            keywords = skill.get("keywords")
            category = keywords[0] if keywords and len(keywords) > 0 else "Other"
            by_category.setdefault(category, []).append(skill.get("name", ""))

        for category, names in by_category.items():
            key = re.sub(r"[^a-z0-9]+", "_", category.lower()).strip("_")
            sections[key] = [
                {
                    "label": category,
                    "details": ", ".join(names),
                }
            ]

    # ── Social Networks ───────────────────────────────────────────────────────
    profiles = basics.get("profiles", [])
    social_networks = [
        {"network": p.get("network", ""), "username": p.get("username", "")}
        for p in profiles
        if p.get("network") and p.get("username")
    ]

    cv_dict: dict[str, Any] = {
        "name": basics.get("name"),
        "location": location_to_string(basics.get("location")),
        "sections": sections,
    }
    if basics.get("email"):
        cv_dict["email"] = basics["email"]
    if basics.get("phone"):
        cv_dict["phone"] = basics["phone"]
    if basics.get("url"):
        cv_dict["website"] = basics["url"]
    if social_networks:
        cv_dict["social_networks"] = social_networks

    return {"cv": cv_dict}
