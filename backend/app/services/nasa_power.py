"""NASA POWER (Prediction Of Worldwide Energy Resources) – agroclimatology monthly data.

Docs: https://power.larc.nasa.gov/docs/services/api/temporal/monthly/
Variables come from MERRA-2 (temperature, soil wetness) and GPM IMERG-corrected precipitation.
"""

import calendar
import datetime as dt
import statistics

import httpx

from .. import cache
from ..config import CLIMATE_YEARS

POWER_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point"
PARAMETERS = ["T2M", "T2M_MAX", "T2M_MIN", "T2M_RANGE", "PRECTOTCORR", "GWETROOT", "ALLSKY_SFC_SW_DWN", "RH2M"]
MISSING = -999


class PowerError(RuntimeError):
    pass


async def fetch_monthly(client: httpx.AsyncClient, lat: float, lon: float) -> dict:
    key = cache.coord_key("power-v2", lat, lon)
    if (hit := cache.get(key)) is not None:
        return hit

    end = dt.date.today().year - 1
    last_error = None
    # The newest year is sometimes not published yet; step back once if so.
    for end_year in (end, end - 1):
        params = {
            "parameters": ",".join(PARAMETERS),
            "community": "AG",
            "latitude": round(lat, 4),
            "longitude": round(lon, 4),
            "start": end_year - CLIMATE_YEARS + 1,
            "end": end_year,
            "format": "JSON",
        }
        try:
            r = await client.get(POWER_URL, params=params)
            r.raise_for_status()
            data = r.json()["properties"]["parameter"]
            cache.set(key, data)
            return data
        except (httpx.HTTPError, KeyError, ValueError) as e:
            last_error = e
    raise PowerError(f"NASA POWER request failed: {last_error}")


def _valid(v) -> bool:
    return v is not None and v != MISSING


def summarize(raw: dict) -> dict:
    """Turn raw POWER monthly series into normals, annual series and trends."""
    normals = []
    for m in range(1, 13):
        row = {"month": m, "label": calendar.month_abbr[m]}
        for p in PARAMETERS:
            vals = []
            for k, v in raw.get(p, {}).items():
                if int(k[4:]) != m or not _valid(v):
                    continue
                if p == "PRECTOTCORR":
                    year = int(k[:4])
                    v = v * calendar.monthrange(year, m)[1]  # mm/day -> mm/month
                vals.append(v)
            row[p] = round(statistics.fmean(vals), 2) if vals else None
        # Monthly T2M_MAX is the single hottest hour of the month; crops respond to the
        # average daily maximum, which we derive from the mean and the mean diurnal range.
        row["T2M_DAYMAX"] = (
            round(row["T2M"] + row["T2M_RANGE"] / 2, 2) if row["T2M"] is not None and row["T2M_RANGE"] is not None else row["T2M_MAX"]
        )
        normals.append(row)

    years = sorted({int(k[:4]) for k in raw.get("T2M", {})})
    annual = []
    for y in years:
        t = raw["T2M"].get(f"{y}13")
        monthly_p = [
            raw["PRECTOTCORR"].get(f"{y}{m:02d}") for m in range(1, 13)
        ]
        if not _valid(t) or not all(_valid(v) for v in monthly_p):
            continue
        rain = sum(v * calendar.monthrange(y, m)[1] for m, v in enumerate(monthly_p, start=1))
        tmax = raw["T2M_MAX"].get(f"{y}13")
        annual.append({"year": y, "t_mean": t, "t_max": tmax if _valid(tmax) else None, "rain_mm": round(rain, 1)})

    rains = [a["rain_mm"] for a in annual]
    temps = [a["t_mean"] for a in annual]
    xs = [a["year"] for a in annual]

    return {
        "normals": normals,
        "annual": annual,
        "trends": {
            "warming_c_per_decade": round(_slope(xs, temps) * 10, 2) if len(xs) > 2 else 0.0,
            "rain_change_pct_per_decade": (
                round(_slope(xs, rains) * 10 / statistics.fmean(rains) * 100, 1) if len(xs) > 2 and statistics.fmean(rains) > 0 else 0.0
            ),
            "rain_variability_cv": round(statistics.pstdev(rains) / statistics.fmean(rains), 3) if len(rains) > 1 and statistics.fmean(rains) > 0 else 0.0,
            "annual_rain_mm": round(statistics.fmean(rains), 0) if rains else None,
            "annual_temp_c": round(statistics.fmean(temps), 1) if temps else None,
            "hot_months": sum(1 for n in normals if (n["T2M_DAYMAX"] or 0) >= 35),
            "years": f"{xs[0]}–{xs[-1]}" if xs else "",
        },
    }


def _slope(xs: list[float], ys: list[float]) -> float:
    mx, my = statistics.fmean(xs), statistics.fmean(ys)
    den = sum((x - mx) ** 2 for x in xs)
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / den if den else 0.0
