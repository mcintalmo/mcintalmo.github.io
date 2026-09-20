"""Canonical repository paths and location constants."""

from pathlib import Path

# Path hierarchy:
# .parents[0] = common/ (package)
# .parents[1] = src/
# .parents[2] = common (project root)
# .parents[3] = backend/
# .parents[4] = repository root
REPO_ROOT: Path = Path(__file__).resolve().parents[4]

RESUME_DIR: Path = REPO_ROOT / "resume"
FRONTEND_DIR: Path = REPO_ROOT / "frontend"
BACKEND_DIR: Path = REPO_ROOT / "backend"
PUBLIC_DIR: Path = FRONTEND_DIR / "public"
SITE_CONFIG_PATH: Path = REPO_ROOT / "site-config.yaml"
SOURCE_RESUME_YAML: Path = RESUME_DIR / "resume.yaml"
DESIGN_YAML: Path = RESUME_DIR / "themes" / "classic" / "design.yaml"
PDF_CONFIG_PATH: Path = RESUME_DIR / "pdf-config.yaml"
