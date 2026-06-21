"""
Resume build script.

Single source of truth: resume/resume.yaml  (JSON Resume schema in YAML notation)

Pipeline:
  1. Convert JSON Resume → RenderCV YAML  (via Node.js converter)
  2. Render PDF + Markdown via RenderCV    (Typst backend)
  3. Copy source resume.yaml verbatim      (for download)
  4. Emit resume.json                      (JSON Resume, from source)
  5. Copy all four to frontend/public/
  6. Build agent context JSON              (for voice agent)

All build outputs land in:
  resume/output/         — intermediate artefacts
  frontend/public/       — static assets served at /resume.*

Usage:
  # From repo root via Makefile:
  make build-resume

  # Directly (from backend/ directory):
  uv run --package resume python -m resume.build

  # Skip PDF (faster, no Typst compilation):
  uv run --package resume python -m resume.build --no-pdf
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

import yaml

# ── Path constants ─────────────────────────────────────────────────────────────

# build.py → resume/ → src/ → resume(pkg)/ → backend/ → repo root
REPO_ROOT = Path(__file__).parents[4]
RESUME_DIR = REPO_ROOT / "resume"

# Input files
SOURCE_JSON_RESUME = RESUME_DIR / "resume.yaml"  # JSON Resume schema (YAML)
DESIGN_YAML = RESUME_DIR / "themes" / "classic" / "design.yaml"
CONVERTER_SCRIPT = RESUME_DIR / "convert" / "convert.mjs"

# Intermediate
RENDERCV_YAML = RESUME_DIR / "rendercv" / "resume.yaml"  # RenderCV-format YAML

# Outputs
OUTPUT_DIR = RESUME_DIR / "output"
PUBLIC_DIR = REPO_ROOT / "frontend" / "public"
AGENT_CONTEXT = (
    REPO_ROOT / "backend" / "agent" / "src" / "agent" / "portfolio_content.json"
)


# ── Helpers ────────────────────────────────────────────────────────────────────


def log(msg: str) -> None:
    print(f"  → {msg}", flush=True)


def copy_to_public(src: Path, filename: str) -> None:
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    dest = PUBLIC_DIR / filename
    shutil.copy(src, dest)
    log(f"Copied {filename} to {dest.relative_to(REPO_ROOT)}")


# ── Step 1: JSON Resume → RenderCV YAML ───────────────────────────────────────


def convert_to_rendercv() -> Path:
    """
    Run the Node.js converter to produce a RenderCV-format YAML file.
    The design: block is intentionally excluded — injected via design_yaml_file.
    """
    RENDERCV_YAML.parent.mkdir(parents=True, exist_ok=True)

    result = subprocess.run(
        ["node", str(CONVERTER_SCRIPT), str(SOURCE_JSON_RESUME), str(RENDERCV_YAML)],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print("Converter stderr:", result.stderr, file=sys.stderr)
        raise RuntimeError(
            f"JSON Resume → RenderCV conversion failed (exit {result.returncode})"
        )

    log(f"Converted to {RENDERCV_YAML.relative_to(REPO_ROOT)}")
    return RENDERCV_YAML


# ── Step 2: RenderCV render (PDF + Markdown) ───────────────────────────────────


def render_pdf_and_markdown(generate_pdf: bool) -> tuple[Path | None, Path | None]:
    """
    Parse the RenderCV YAML and render via the Python API.

    Uses build_rendercv_dictionary_and_model() with design_yaml_file to inject
    the design: block separately from the cv: content.

    Returns (pdf_path, md_path).
    """
    # Lazy import so the module can be loaded without rendercv installed
    from rendercv.renderer.markdown import (  # type: ignore[import-untyped]
        generate_markdown,
    )
    from rendercv.renderer.pdf_png import (  # type: ignore[import-untyped]
        generate_pdf as _gen_pdf,
    )
    from rendercv.renderer.typst import generate_typst  # type: ignore[import-untyped]
    from rendercv.schema.rendercv_model_builder import (  # type: ignore[import-untyped]
        build_rendercv_dictionary_and_model,
    )

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    yaml_content = RENDERCV_YAML.read_text(encoding="utf-8")

    _dict, model = build_rendercv_dictionary_and_model(
        yaml_content,
        input_file_path=RENDERCV_YAML,
        design_yaml_file=DESIGN_YAML.read_text(encoding="utf-8"),
        output_folder=OUTPUT_DIR,
        pdf_path=OUTPUT_DIR / "resume.pdf",
        markdown_path=OUTPUT_DIR / "resume.md",
        dont_generate_html=True,
        dont_generate_png=True,
        dont_generate_pdf=not generate_pdf,
    )

    # Markdown is always generated (fast, no Typst)
    md_path = generate_markdown(model)
    log(f"Markdown: {md_path.relative_to(REPO_ROOT) if md_path else 'skipped'}")

    pdf_path: Path | None = None
    if generate_pdf:
        typst_path = generate_typst(model)
        pdf_path = _gen_pdf(model, typst_path)
        log(f"PDF:      {pdf_path.relative_to(REPO_ROOT) if pdf_path else 'skipped'}")
    else:
        log("PDF:      skipped (--no-pdf)")

    return pdf_path, md_path


# ── Step 3: YAML copy ──────────────────────────────────────────────────────────


def build_yaml_copy() -> Path:
    """Copy the source resume.yaml (JSON Resume format) verbatim to output."""
    dest = OUTPUT_DIR / "resume.yaml"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy(SOURCE_JSON_RESUME, dest)
    log(f"YAML:     {dest.relative_to(REPO_ROOT)}")
    return dest


# ── Step 4: JSON Resume output ─────────────────────────────────────────────────


def build_json() -> Path:
    """
    Load resume.yaml (JSON Resume in YAML notation) and write resume.json.
    No conversion needed — just parse YAML, serialize as JSON.
    """
    import datetime

    resume_data = yaml.safe_load(SOURCE_JSON_RESUME.read_text(encoding="utf-8"))

    def _json_default(obj: object) -> str:
        if isinstance(obj, (datetime.date, datetime.datetime)):
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


# ── Step 5 / 6: Agent context ──────────────────────────────────────────────────


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


# ── Entry point ────────────────────────────────────────────────────────────────


def main() -> None:
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

    for required in (SOURCE_JSON_RESUME, DESIGN_YAML, CONVERTER_SCRIPT):
        if not required.exists():
            print(f"Error: required file not found: {required}", file=sys.stderr)
            sys.exit(1)

    print("Building resume artifacts...")
    print(f"  Source: {SOURCE_JSON_RESUME.relative_to(REPO_ROOT)}")

    # 1. Convert JSON Resume → RenderCV YAML
    print("\n[1/5] Converting JSON Resume → RenderCV YAML")
    convert_to_rendercv()

    # 2. Render PDF + Markdown
    print("\n[2/5] Rendering via RenderCV (Typst)")
    pdf_path, md_path = render_pdf_and_markdown(generate_pdf=generate_pdf)

    # 3. Copy source YAML
    print("\n[3/5] Copying source YAML")
    yaml_path = build_yaml_copy()

    # 4. Emit JSON Resume
    print("\n[4/5] Writing JSON Resume")
    json_path = build_json()

    # 5. Copy all to frontend/public/
    print("\n[5/5] Copying artefacts to frontend/public/")
    if pdf_path and pdf_path.exists():
        copy_to_public(pdf_path, "resume.pdf")
    if md_path and md_path.exists():
        copy_to_public(md_path, "resume.md")
    if yaml_path.exists():
        copy_to_public(yaml_path, "resume.yaml")
    if json_path.exists():
        copy_to_public(json_path, "resume.json")

    # 6. Agent context (best-effort — don't fail the whole build)
    print("\n[6/6] Building agent context")
    site_config_path = REPO_ROOT / "site-config.yaml"
    resume_data = yaml.safe_load(SOURCE_JSON_RESUME.read_text(encoding="utf-8"))
    site_config = (
        yaml.safe_load(site_config_path.read_text(encoding="utf-8"))
        if site_config_path.exists()
        else {}
    )
    try:
        build_agent_context_file(resume_data, site_config)
    except Exception as exc:
        print(f"  ⚠ agent context failed (non-fatal): {exc}", file=sys.stderr)

    print("\nDone.")
    print(f"  Output dir: {OUTPUT_DIR.relative_to(REPO_ROOT)}/")
    print(f"  Public dir: {PUBLIC_DIR.relative_to(REPO_ROOT)}/")


if __name__ == "__main__":
    main()
