"""MODIS MOD13Q1 (Terra, 250 m, 16-day) NDVI via the ORNL DAAC MODIS Web Service.

Docs: https://modis.ornl.gov/data/modis_webservice.html
The service returns at most 10 composites per call, so a year is fetched in parallel chunks.
"""

import asyncio
import datetime as dt

import httpx

from .. import cache

MODIS_URL = "https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset"
BAND = "250m_16_days_NDVI"
FILL = -3000
CHUNK_DAYS = 150  # < 10 composites of 16 days


def _a_date(d: dt.date) -> str:
    return f"A{d.year}{d.timetuple().tm_yday:03d}"


async def _chunk(client: httpx.AsyncClient, lat: float, lon: float, start: dt.date, end: dt.date) -> list[dict]:
    params = {
        "latitude": round(lat, 4),
        "longitude": round(lon, 4),
        "band": BAND,
        "startDate": _a_date(start),
        "endDate": _a_date(end),
        "kmAboveBelow": 0,
        "kmLeftRight": 0,
    }
    try:
        r = await client.get(MODIS_URL, params=params, headers={"Accept": "application/json"})
        r.raise_for_status()
        subset = r.json().get("subset", [])
    except (httpx.HTTPError, ValueError):
        return []
    out = []
    for s in subset:
        v = s["data"][0] if s.get("data") else FILL
        if v != FILL:
            out.append({"date": s["calendar_date"], "ndvi": round(v * 0.0001, 3)})
    return out


async def fetch_ndvi(client: httpx.AsyncClient, lat: float, lon: float, days: int = 365) -> dict:
    key = cache.coord_key("ndvi", lat, lon)
    if (hit := cache.get(key)) is not None:
        return hit

    end = dt.date.today() - dt.timedelta(days=20)
    start = end - dt.timedelta(days=days)
    windows = []
    cur = start
    while cur < end:
        nxt = min(cur + dt.timedelta(days=CHUNK_DAYS), end)
        windows.append((cur, nxt))
        cur = nxt + dt.timedelta(days=1)

    chunks = await asyncio.gather(*[_chunk(client, lat, lon, a, b) for a, b in windows])
    series = sorted({p["date"]: p for c in chunks for p in c}.values(), key=lambda p: p["date"])

    vals = [p["ndvi"] for p in series]
    result = {
        "series": series,
        "mean": round(sum(vals) / len(vals), 3) if vals else None,
        "peak": max(vals) if vals else None,
        "low": min(vals) if vals else None,
        "available": bool(series),
    }
    if series:
        cache.set(key, result)
    return result
