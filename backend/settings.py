"""Environment configuration. Reads an optional ``.env`` file from the repo root.

DATABASE_URL  SQLAlchemy URL (default: the committed ``fitness.db`` in the repo root)
CORS_ORIGINS  comma-separated allowed origins, or ``*`` (default) for any origin
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(REPO_ROOT / ".env")

DEFAULT_DB_PATH = REPO_ROOT / "fitness.db"
DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH.as_posix()}")


def cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "*")
    return [o.strip() for o in raw.split(",") if o.strip()] or ["*"]
