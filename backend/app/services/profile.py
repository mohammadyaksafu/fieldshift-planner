"""Builds a field profile: climate (NASA POWER), vegetation (MODIS NDVI), soil (SoilGrids) and seasons."""

import asyncio
import datetime as dt

import httpx

from ..config import HTTP_TIMEOUT, USER_AGENT
from ..engine.climate import season_stats
from . import modis, nasa_power, soilgrids

NORTH_SEASONS = {"warm": [4, 5, 6, 7, 8, 9], "cool": [10, 11, 12, 1, 2, 3]}
SOUTH_SEASONS = {"warm": [10, 11, 12, 1, 2, 3], "cool": [4, 5, 6, 7, 8, 9]}


def season_months(lat: float) -> dict[str, list[int]]:
    return NORTH_SEASONS if lat >= 0 else SOUTH_SEASONS


def planning_calendar(lat: float, n: int, today: dt.date | None = None) -> list[dict]:
    """Upcoming seasons to plan for. Starts with the current season if it began < ~6 weeks ago."""
    today = today or dt.date.today()
    seasons = season_months(lat)
    starts = sorted(((m[0], name) for name, m in seasons.items()))  # e.g. [(4,'warm'),(10,'cool')]

    candidates = sorted(
        (dt.date(year, month, 1), name)
        for year in range(today.year - 1, today.year + n)
        for month, name in starts
    )
    current = [c for c in candidates if c[0] <= today][-1]
    first_idx = candidates.index(current)
    if (today - current[0]).days > 45:
        first_idx += 1

    out = []
    for i in range(n):
        start, name = candidates[first_idx + i]
        months = seasons[name]
        end_year = start.year + (1 if months[-1] < months[0] else 0)
        year_label = str(start.year) if end_year == start.year else f"{start.year}–{str(end_year)[2:]}"
        out.append({"index": i, "season": name, "start": start.isoformat(), "label": f"{name.title()} {year_label}"})
    return out


async def build_profile(lat: float, lon: float) -> dict:
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT, headers={"User-Agent": USER_AGENT}) as client:
        power_raw, soil, ndvi = await asyncio.gather(
            nasa_power.fetch_monthly(client, lat, lon),
            soilgrids.fetch_soil(client, lat, lon),
            modis.fetch_ndvi(client, lat, lon),
            return_exceptions=True,
        )

    if isinstance(power_raw, Exception):
        raise power_raw
    if isinstance(soil, Exception):
        soil = {**soilgrids.DEFAULT_SOIL, "texture": "loam", "estimated": True, "source": "Default loam (SoilGrids unavailable)"}
    if isinstance(ndvi, Exception):
        ndvi = {"series": [], "mean": None, "peak": None, "low": None, "available": False}

    climate = nasa_power.summarize(power_raw)
    months = season_months(lat)
    seasons = {name: season_stats(climate["normals"], m) for name, m in months.items()}

    return {
        "location": {"lat": round(lat, 4), "lon": round(lon, 4), "hemisphere": "north" if lat >= 0 else "south"},
        "climate": climate,
        "seasons": seasons,
        "soil": soil,
        "ndvi": ndvi,
        "sources": [
            {"name": "NASA POWER (MERRA-2 / GPM IMERG)", "use": "Temperature, rainfall, root-zone soil wetness, solar radiation", "url": "https://power.larc.nasa.gov/"},
            {"name": "NASA MODIS Terra MOD13Q1 via ORNL DAAC", "use": "Vegetation health (NDVI), last 12 months", "url": "https://modis.ornl.gov/data/modis_webservice.html"},
            {"name": "ISRIC SoilGrids 2.0", "use": "Soil texture, organic carbon, pH, nitrogen", "url": "https://soilgrids.org/"},
            {"name": "FAO ECOCROP / FAO-56", "use": "Crop temperature and water requirements", "url": "https://www.fao.org/land-water/databases-and-software/crop-information/en/"},
        ],
    }
