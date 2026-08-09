from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parent.parent
CATALOG_PATH = ROOT / "config" / "api-catalog.yaml"


def load_catalog() -> list[dict[str, Any]]:
    if not CATALOG_PATH.exists():
        return []
    data = yaml.safe_load(CATALOG_PATH.read_text(encoding="utf-8")) or {}
    return data.get("catalog", [])


def get_api(api_id: str) -> dict[str, Any] | None:
    wanted = api_id.strip().upper()
    return next((item for item in load_catalog() if item.get("id") == wanted), None)


def public_catalog() -> list[dict[str, Any]]:
    return [
        {
            "id": item.get("id"),
            "label": item.get("label"),
            "category": item.get("category"),
            "transport": item.get("transport"),
            "enabled": bool(item.get("enabled", False)),
        }
        for item in load_catalog()
    ]
