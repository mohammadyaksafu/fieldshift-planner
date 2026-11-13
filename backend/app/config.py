import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

CACHE_DIR = Path(os.getenv("FIELDSHIFT_CACHE_DIR", BASE_DIR / ".cache"))
CACHE_TTL_SECONDS = int(os.getenv("FIELDSHIFT_CACHE_TTL", 7 * 24 * 3600))

HTTP_TIMEOUT = float(os.getenv("FIELDSHIFT_HTTP_TIMEOUT", 60))

CORS_ORIGINS = [
    o.strip()
    for o in os.getenv("FIELDSHIFT_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip()
]

# Number of past years of NASA POWER data used for climate normals and trends.
CLIMATE_YEARS = int(os.getenv("FIELDSHIFT_CLIMATE_YEARS", 15))

USER_AGENT = "FieldShiftPlanner/1.0 (NASA Space Apps 2026)"
