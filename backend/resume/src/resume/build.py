"""Resume build script.

Single source of truth: resume/resume.yaml (JSON Resume schema in YAML notation)

Pipeline:
  1. Convert JSON Resume -> RenderCV YAML (pure Python via resume.converter)
  2. Render PDF + Markdown via RenderCV (Typst backend)
  3. Copy source resume.yaml verbatim (for download)
  4. Emit resume.json (JSON Resume, from source)
  5. Copy all four to frontend/public/
  6. Build agent context JSON (for voice agent)

All build outputs land in:
  resume/output/   - intermediate artefacts
  frontend/public/ - static assets served at /resume.*

Usage:
  # From repo root via just:
  just build-resume

  # Directly (from backend/ directory):
  uv run --package resume python -m resume.build

  # Skip PDF (faster, no Typst compilation):
  uv run --package resume python -m resume.build --no-pdf
"""

from __future__ import annotations

import argparse
import copy
import datetime
import json
import shutil
import sys
from collections.abc import Callable
from pathlib import Path
from typing import Any

import yaml

from common.paths import (
    DESIGN_YAML,
    PDF_CONFIG_PATH,
    PUBLIC_DIR,
    REPO_ROOT,
    RESUME_DIR,
    SITE_CONFIG_PATH,
    SOURCE_RESUME_YAML,
)
from resume.converter import convert_json_resume_to_rendercv

# Intermediate and outputs
OUTPUT_DIR: Path = RESUME_DIR / "output"
RENDERCV_YAML: Path = RESUME_DIR / "rendercv" / "resume.yaml"
AGENT_CONTEXT: Path = (
    REPO_ROOT / "backend" / "agent" / "src" / "agent" / "portfolio_content.json"
)


def log(msg: str) -> None:
    """Print an indented progress message."""
    print(f"  -> {msg}", flush=True)


def copy_to_public(src: Path, filename: str) -> None:
    """Copy a generated file to the frontend public directory."""
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    dest = PUBLIC_DIR / filename
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(src, dest)
    log(f"Copied {filename} to {dest.relative_to(REPO_ROOT)}")


def filter_resume_for_pdf(
    resume_data: dict[str, Any], config: dict[str, Any]
) -> dict[str, Any]:
    """Filter and format the JSON Resume data for the concise 1-page PDF."""
    res = copy.deepcopy(resume_data)

    # 1. Exclude sections
    exclude_sections = config.get("exclude_sections", [])
    for sec in exclude_sections:
        res.pop(sec, None)

    # 2. Filter Work Experience
    work_conf = config.get("work", {})
    max_entries = work_conf.get("max_entries")
    max_highlights = work_conf.get("max_highlights")

    if "work" in res and isinstance(res["work"], list):
        if max_entries is not None:
            res["work"] = res["work"][:max_entries]
        if max_highlights is not None:
            for job in res["work"]:
                if "highlights" in job and isinstance(job["highlights"], list):
                    job["highlights"] = job["highlights"][:max_highlights]

    # 3. Filter/Format Education
    edu_conf = config.get("education", {})
    horizontal_insts = edu_conf.get("horizontal_highlights", [])
    exclude_courses = edu_conf.get("exclude_courses", False)

    if "education" in res and isinstance(res["education"], list):
        for edu in res["education"]:
            if exclude_courses:
                edu.pop("courses", None)

            inst_name = edu.get("institution", "")
            if inst_name in horizontal_insts:
                achievements = edu.get("achievements", [])
                courses = edu.get("courses", []) if not exclude_courses else []
                items = achievements + courses
                if items:
                    joined = " • ".join(items)
                    edu["achievements"] = [joined]
                    edu.pop("courses", None)

    return res


def post_process_rendercv_data(
    rendercv_data: dict[str, Any],
    resume_data: dict[str, Any],
    config: dict[str, Any],
) -> dict[str, Any]:
    """Post-process RenderCV dictionary to format skills and education horizontally."""
    skills_conf = config.get("skills", {})
    if not skills_conf:
        return rendercv_data

    if (
        not rendercv_data
        or "cv" not in rendercv_data
        or "sections" not in rendercv_data["cv"]
    ):
        return rendercv_data

    sections = rendercv_data["cv"]["sections"]

    known_categories = [
        "languages_frameworks",
        "machine_learning_ai",
        "llm_agents",
        "data_engineering_analytics",
        "cloud_infrastructure",
        "mlops_observability",
        "other",
    ]

    for cat in known_categories:
        sections.pop(cat, None)

    section_title = skills_conf.get("section_title", "skills").lower().replace(" ", "_")

    # Post-process education entries to map highlights to a smaller summary field
    if "education" in sections and isinstance(sections["education"], list):
        for edu in sections["education"]:
            if "highlights" in edu and isinstance(edu["highlights"], list):
                joined = " • ".join(edu["highlights"])
                joined = joined.replace(" and ", " & ").replace(
                    " Honor Society Member", ""
                )
                edu["summary"] = f"#text(size: 8.0pt)[{joined}]"
                edu.pop("highlights", None)

    grouped_conf = skills_conf.get("grouped")
    if grouped_conf and isinstance(grouped_conf, dict):
        skills_entries: list[dict[str, str]] = []
        for label, skills_list in grouped_conf.items():
            if isinstance(skills_list, list):
                skills_entries.append(
                    {"label": label, "details": ", ".join(str(s) for s in skills_list)}
                )
        sections[section_title] = skills_entries
        log("Post-processed RenderCV dictionary to group skills.")
    elif skills_conf.get("single_list", False):
        all_skills = [s["name"] for s in resume_data.get("skills", []) if "name" in s]
        if all_skills:
            skills_text = ", ".join(all_skills)
            sections[section_title] = [skills_text]
            log("Merged skills into a single horizontal list.")

    return rendercv_data


def compile_rendercv_artifacts(
    resume_yaml_data_or_path: dict[str, Any] | Path,
    output_dir: Path,
    pdf_filename: str = "resume.pdf",
    markdown_filename: str = "resume.md",
    generate_pdf: bool = True,
    design_yaml_path: Path | None = None,
    post_processor: Callable[[dict[str, Any]], dict[str, Any]] | None = None,
) -> tuple[Path | None, Path | None]:
    """Compile JSON Resume data or file into RenderCV PDF and Markdown artifacts.

    Pure Python: uses converter.convert_json_resume_to_rendercv without Node.js.
    """
    from rendercv.renderer.markdown import (
        generate_markdown,  # type: ignore[import-untyped]
    )
    from rendercv.renderer.pdf_png import (
        generate_pdf as _gen_pdf,  # type: ignore[import-untyped]
    )
    from rendercv.renderer.typst import generate_typst  # type: ignore[import-untyped]
    from rendercv.schema.rendercv_model_builder import (  # type: ignore[import-untyped]
        build_rendercv_dictionary_and_model,
    )

    if isinstance(resume_yaml_data_or_path, Path):
        resume_data: dict[str, Any] = yaml.safe_load(
            resume_yaml_data_or_path.read_text(encoding="utf-8")
        )
    else:
        resume_data = resume_yaml_data_or_path

    rendercv_dict = convert_json_resume_to_rendercv(resume_data)
    if post_processor is not None:
        rendercv_dict = post_processor(rendercv_dict)

    output_dir.mkdir(parents=True, exist_ok=True)
    rendercv_yaml_path = output_dir / "rendercv.yaml"
    rendercv_yaml_text = yaml.dump(rendercv_dict, sort_keys=False, width=120)
    rendercv_yaml_path.write_text(rendercv_yaml_text, encoding="utf-8")

    active_design_yaml = design_yaml_path or DESIGN_YAML
    design_content = active_design_yaml.read_text(encoding="utf-8")

    pdf_target_path = output_dir / pdf_filename
    md_target_path = output_dir / markdown_filename

    _dict, model = build_rendercv_dictionary_and_model(
        rendercv_yaml_text,
        input_file_path=rendercv_yaml_path,
        design_yaml_file=design_content,
        output_folder=output_dir,
        pdf_path=pdf_target_path,
        markdown_path=md_target_path,
        dont_generate_html=True,
        dont_generate_png=True,
        dont_generate_pdf=not generate_pdf,
    )

    md_path: Path | None = generate_markdown(model)
    pdf_path: Path | None = None
    if generate_pdf:
        typst_path = generate_typst(model)
        pdf_path = _gen_pdf(model, typst_path)

    return pdf_path, md_path


def build_yaml_copy() -> Path:
    """Copy the source resume.yaml (JSON Resume format) verbatim to output."""
    dest = OUTPUT_DIR / "resume.yaml"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy(SOURCE_RESUME_YAML, dest)
    log(f"YAML:     {dest.relative_to(REPO_ROOT)}")
    return dest


def build_json() -> Path:
    """Load resume.yaml (JSON Resume in YAML notation) and write resume.json."""
    resume_data = yaml.safe_load(SOURCE_RESUME_YAML.read_text(encoding="utf-8"))

    def _json_default(obj: object) -> str:
        if isinstance(obj, datetime.date | datetime.datetime):
            return str(obj)
        raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")

    dest = OUTPUT_DIR / "resume.json"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    dest.write_text(
        json.dumps(resume_data, indent=2, ensure_ascii=False, default=_json_default),
        encoding="utf-8",
    )
    log(f"JSON:     {dest.relative_to(REPO_ROOT)}")
    return dest


def build_agent_context_file(
    resume_data: dict[str, Any], site_config: dict[str, Any]
) -> Path:
    """Build structured agent context and write to portfolio_content.json."""
    from .agent_context import build_agent_context

    context = build_agent_context(resume_data, site_config)
    AGENT_CONTEXT.parent.mkdir(parents=True, exist_ok=True)
    AGENT_CONTEXT.write_text(
        json.dumps(context, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    log(f"Agent context: {AGENT_CONTEXT.relative_to(REPO_ROOT)}")
    return AGENT_CONTEXT


def main() -> None:
    """Main resume build CLI entrypoint."""
    parser = argparse.ArgumentParser(
        description="Build resume artifacts from resume/resume.yaml."
    )
    parser.add_argument(
        "--no-pdf",
        action="store_true",
        help="Skip PDF generation (no Typst compilation; fast iteration mode).",
    )
    args = parser.parse_args()
    generate_pdf = not args.no_pdf

    for required in (SOURCE_RESUME_YAML, DESIGN_YAML):
        if not required.exists():
            print(f"Error: required file not found: {required}", file=sys.stderr)
            sys.exit(1)

    print("Building resume artifacts...")
    print(f"  Source: {SOURCE_RESUME_YAML.relative_to(REPO_ROOT)}")

    # Load pdf-config.yaml
    pdf_config: dict[str, Any] = {}
    if PDF_CONFIG_PATH.exists():
        try:
            pdf_config = (
                yaml.safe_load(PDF_CONFIG_PATH.read_text(encoding="utf-8")) or {}
            )
            print(f"  Loaded PDF config: {PDF_CONFIG_PATH.relative_to(REPO_ROOT)}")
        except Exception as exc:
            print(f"  Warning: Failed to load pdf-config.yaml: {exc}", file=sys.stderr)

    # 1. Prepare concise resume for PDF/MD rendering
    print("\n[1/5] Preparing concise JSON Resume data")
    resume_data_full = yaml.safe_load(SOURCE_RESUME_YAML.read_text(encoding="utf-8"))

    if pdf_config:
        resume_data_concise = filter_resume_for_pdf(resume_data_full, pdf_config)
    else:
        resume_data_concise = resume_data_full

    # 2. Render PDF + Markdown via pure Python
    print("\n[2/5] Rendering via RenderCV (pure Python)")
    post_processor = (
        (lambda d: post_process_rendercv_data(d, resume_data_full, pdf_config))
        if pdf_config
        else None
    )

    pdf_path, md_path = compile_rendercv_artifacts(
        resume_yaml_data_or_path=resume_data_concise,
        output_dir=OUTPUT_DIR,
        pdf_filename="resume.pdf",
        markdown_filename="resume.md",
        generate_pdf=generate_pdf,
        design_yaml_path=DESIGN_YAML,
        post_processor=post_processor,
    )

    # Save canonical rendercv yaml for inspection
    RENDERCV_YAML.parent.mkdir(parents=True, exist_ok=True)
    if (OUTPUT_DIR / "rendercv.yaml").exists():
        shutil.copy(OUTPUT_DIR / "rendercv.yaml", RENDERCV_YAML)

    # 3. Copy source YAML
    print("\n[3/5] Copying source YAML")
    yaml_path = build_yaml_copy()

    # 4. Emit JSON Resume
    print("\n[4/5] Writing JSON Resume")
    json_path = build_json()

    # 5. Copy all to frontend/public/
    print("\n[5/6] Copying artefacts to frontend/public/")
    if pdf_path and pdf_path.exists():
        copy_to_public(pdf_path, "resume.pdf")
        copy_to_public(pdf_path, "downloads/McIntosh_Alexander_Resume.pdf")
    if md_path and md_path.exists():
        copy_to_public(md_path, "resume.md")
    if yaml_path.exists():
        copy_to_public(yaml_path, "resume.yaml")
    if json_path.exists():
        copy_to_public(json_path, "resume.json")

    # 6. Agent context (best-effort)
    print("\n[6/6] Building agent context")
    site_config = (
        yaml.safe_load(SITE_CONFIG_PATH.read_text(encoding="utf-8"))
        if SITE_CONFIG_PATH.exists()
        else {}
    )
    try:
        build_agent_context_file(resume_data_full, site_config)
    except Exception as exc:
        print(f"  Warning: Agent context failed (non-fatal): {exc}", file=sys.stderr)

    print("\nDone.")
    print(f"  Output dir: {OUTPUT_DIR.relative_to(REPO_ROOT)}/")
    print(f"  Public dir: {PUBLIC_DIR.relative_to(REPO_ROOT)}/")


if __name__ == "__main__":
    main()
