"""Small two-level (memory + disk) JSON cache so repeated demos don't hammer public APIs."""

import json
import time
from typing import Any

from .config import CACHE_DIR, CACHE_TTL_SECONDS

_memory: dict[str, tuple[float, Any]] = {}


def _path(key: str):
    safe = "".join(c if c.isalnum() or c in "-_." else "_" for c in key)
    return CACHE_DIR / f"{safe}.json"


def get(key: str) -> Any | None:
    now = time.time()
    hit = _memory.get(key)
    if hit and now - hit[0] < CACHE_TTL_SECONDS:
        return hit[1]
    path = _path(key)
    if path.exists():
        try:
            stored = json.loads(path.read_text(encoding="utf-8"))
            if now - stored["ts"] < CACHE_TTL_SECONDS:
                _memory[key] = (stored["ts"], stored["value"])
                return stored["value"]
        except (ValueError, KeyError, OSError):
            pass
    return None


def set(key: str, value: Any) -> None:
    ts = time.time()
    _memory[key] = (ts, value)
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        _path(key).write_text(json.dumps({"ts": ts, "value": value}), encoding="utf-8")
    except OSError:
        pass


def coord_key(prefix: str, lat: float, lon: float) -> str:
    return f"{prefix}_{lat:.2f}_{lon:.2f}"
