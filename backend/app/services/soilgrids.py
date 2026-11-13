"""ISRIC SoilGrids 2.0 – global soil properties at 250 m.

Docs: https://rest.isric.org/soilgrids/v2.0/docs
SoilGrids has no data over cities and water, so we probe a few nearby points and
fall back to a neutral loam profile (clearly flagged as estimated) if nothing is found.
"""

import asyncio
import statistics

import httpx

from .. import cache

SOILGRIDS_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query"
PROPERTIES = ["clay", "sand", "silt", "soc", "phh2o", "nitrogen"]
DEPTHS = ["0-5cm", "5-15cm", "15-30cm"]
OFFSETS = [(0, 0), (0.02, 0.02), (-0.02, -0.02), (0.03, -0.03)]

DEFAULT_SOIL = {"clay": 25.0, "sand": 40.0, "silt": 35.0, "soc": 12.0, "phh2o": 6.5, "nitrogen": 1.2}


async def _query(client: httpx.AsyncClient, lat: float, lon: float) -> dict | None:
    params = [("lat", round(lat, 4)), ("lon", round(lon, 4)), ("value", "mean")]
    params += [("property", p) for p in PROPERTIES] + [("depth", d) for d in DEPTHS]
    try:
        r = await client.get(SOILGRIDS_URL, params=params)
        r.raise_for_status()
        layers = r.json()["properties"]["layers"]
    except (httpx.HTTPError, KeyError, ValueError):
        return None

    out = {}
    for layer in layers:
        factor = layer["unit_measure"]["d_factor"] or 1
        vals = [d["values"]["mean"] for d in layer["depths"] if d["values"]["mean"] is not None]
        if vals:
            out[layer["name"]] = round(statistics.fmean(vals) / factor, 2)
    return out if {"clay", "sand", "phh2o"} <= out.keys() else None


async def fetch_soil(client: httpx.AsyncClient, lat: float, lon: float) -> dict:
    key = cache.coord_key("soil", lat, lon)
    if (hit := cache.get(key)) is not None:
        return hit

    soil, estimated = None, True
    first = await _query(client, lat, lon)
    if first:
        soil, estimated = first, False
    else:
        results = await asyncio.gather(*[_query(client, lat + dy, lon + dx) for dy, dx in OFFSETS[1:]])
        found = next((r for r in results if r), None)
        if found:
            soil, estimated = found, False

    merged = {**DEFAULT_SOIL, **(soil or {})}
    result = {
        **merged,
        "texture": texture_class(merged["sand"], merged["clay"]),
        "estimated": estimated,
        "source": "Default loam (SoilGrids has no data here)" if estimated else "ISRIC SoilGrids 2.0 (0–30 cm mean)",
    }
    cache.set(key, result)
    return result


def texture_class(sand: float, clay: float) -> str:
    if clay >= 40:
        return "clay"
    if sand >= 65 and clay < 20:
        return "sandy"
    return "loam"
