"""Mensajes estructurados compartidos para las respuestas de backend."""

import json
from pathlib import Path
from typing import Any

_CATALOG_PATH = Path(__file__).with_name("message_codes.json")
MESSAGE_CODES: dict[str, list[str]] = json.loads(
    _CATALOG_PATH.read_text(encoding="utf-8")
)


def message(code: str, **params: Any) -> dict[str, Any]:
    declared = MESSAGE_CODES.get(code)
    if declared is None:
        raise ValueError(f"Unknown backend message code: {code}")
    if set(params) != set(declared):
        raise ValueError(
            f"Message {code} requires params {declared}; received {sorted(params)}"
        )
    return {"code": code, "params": params}
