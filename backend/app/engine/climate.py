"""Season and growing-window climate statistics from NASA POWER monthly normals."""

import calendar
import statistics

GROWING_TEMP_C = 5.0


def season_stats(normals: list[dict], months: list[int]) -> dict:
    rows = [normals[m - 1] for m in months]

    def mean(key: str) -> float:
        vals = [r[key] for r in rows if r[key] is not None]
        return round(statistics.fmean(vals), 2) if vals else 0.0

    growing = [r for r in rows if (r["T2M"] or -99) >= GROWING_TEMP_C]
    return {
        "months": months,
        "label": f"{calendar.month_abbr[months[0]]}–{calendar.month_abbr[months[-1]]}",
        "t_mean": mean("T2M"),
        "t_max": mean("T2M_DAYMAX"),  # average daily maximum
        "t_min": mean("T2M_MIN"),
        "t_coldest": round(min((r["T2M"] for r in rows if r["T2M"] is not None), default=0.0), 1),
        "t_hottest_max": round(max((r["T2M_MAX"] for r in rows if r["T2M_MAX"] is not None), default=0.0), 1),
        "rain_mm": round(sum(r["PRECTOTCORR"] or 0 for r in rows), 0),
        "soil_wetness": mean("GWETROOT"),
        "solar": mean("ALLSKY_SFC_SW_DWN"),
        "growing_months": len(growing),
        # For cold-winter climates: crops grow in the shoulder months only.
        "growing_t_mean": round(statistics.fmean(r["T2M"] for r in growing), 2) if growing else None,
        "growing_rain_mm": round(sum(r["PRECTOTCORR"] or 0 for r in growing), 0),
        "dormant": len(growing) < 3,
    }
