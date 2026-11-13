"""How well a single crop fits a single season at this field.

Everything here is a transparent rule, so every number shown to the farmer can be explained.
"""

from .climate import season_stats
from .crops import Crop

IRRIGATION_SHARE = {"none": 0.0, "limited": 0.5, "full": 1.0}
# Plant-available water a fully moist root zone can contribute over a crop cycle (mm).
SOIL_STORE_MM = {"sandy": 80, "loam": 150, "clay": 170}
RAIN_EFFICIENCY = 0.75  # share of rainfall that becomes usable by the crop


def clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, x))


def trapezoid(x: float, abs_lo: float, opt_lo: float, opt_hi: float, abs_hi: float) -> float:
    if x <= abs_lo or x >= abs_hi:
        return 0.0
    if x < opt_lo:
        return (x - abs_lo) / (opt_lo - abs_lo)
    if x > opt_hi:
        return (abs_hi - x) / (abs_hi - opt_hi)
    return 1.0


def season_fit(crop: Crop, season: dict, soil: dict, irrigation: str) -> dict:
    """Suitability (0..1), expected relative yield (0..1), irrigation need and limiting factors."""
    if crop.id == "fallow":
        return {"suitability": 1.0, "yield_factor": 0.0, "irrigation_mm": 0.0, "water_need_mm": 0.0,
                "water_stress": 0.0, "flood_risk": 0.0, "heat_margin": 99.0, "limits": []}

    limits: list[str] = []

    if season["dormant"]:
        # Cold winter: only autumn-sown, winter-hardy crops survive; they grow in the shoulder months.
        if not crop.winter_hardy:
            return {"suitability": 0.0, "yield_factor": 0.0, "irrigation_mm": 0.0, "water_need_mm": 0.0,
                    "water_stress": 0.0, "flood_risk": 0.0, "heat_margin": 99.0,
                    "limits": [f"Winter too cold (coldest month {season['t_coldest']}°C)"]}
        coldest = season["t_coldest"]
        temp_score = 0.9 if coldest > -10 else 0.65 if coldest > -18 else 0.25
        if coldest <= -10:
            limits.append(f"Harsh winter ({coldest}°C) risks winter-kill")
        heat_score = 1.0
        heat_margin = 99.0
        need = crop.water_mm * 0.6
        rain = season["growing_rain_mm"] + 0.5 * (season["rain_mm"] - season["growing_rain_mm"])
    else:
        t = season["t_mean"]
        temp_score = trapezoid(t, crop.t_abs[0], crop.t_opt[0], crop.t_opt[1], crop.t_abs[1])
        if temp_score < 0.7:
            side = "cool" if t < crop.t_opt[0] else "warm"
            limits.append(f"Season too {side} (mean {t:.1f}°C, ideal {crop.t_opt[0]:.0f}–{crop.t_opt[1]:.0f}°C)")
        heat_margin = crop.heat_limit - season["t_max"]
        heat_score = clamp(1 + heat_margin / 6) if heat_margin < 0 else 1.0
        if heat_margin < 0:
            limits.append(f"Heat stress: avg daily max {season['t_max']:.1f}°C > {crop.heat_limit:.0f}°C limit")
        need = crop.water_mm
        rain = season["rain_mm"]

    effective = RAIN_EFFICIENCY * rain + season["soil_wetness"] * SOIL_STORE_MM.get(soil["texture"], 150)
    deficit = max(0.0, need - effective)
    irrigation_mm = deficit * IRRIGATION_SHARE.get(irrigation, 0.0)
    unmet = deficit - irrigation_mm
    water_stress = clamp(unmet / need) if need else 0.0
    # FAO-33 yield response: 1 - Ya/Ym = Ky * (1 - ETa/ETm); drought-tolerant crops have a lower Ky.
    ky = 1.25 - 0.6 * crop.drought_tol
    water_factor = clamp(1 - ky * water_stress)
    if water_stress > 0.25:
        limits.append(f"Rain covers only {100 * (1 - deficit / need):.0f}% of water need")

    surplus = effective - need * 1.8
    flood_risk = 0.0
    if surplus > 0:
        wet = season["soil_wetness"] > 0.7 or soil["texture"] == "clay"
        flood_risk = clamp(surplus / need) * (1 - crop.waterlog_tol) * (1.0 if wet else 0.5)
        if flood_risk > 0.25:
            limits.append("Waterlogging risk in heavy rain")

    ph = soil["phh2o"]
    ph_dist = max(crop.ph[0] - ph, ph - crop.ph[1], 0)
    ph_score = clamp(1 - 0.3 * ph_dist)
    if ph_dist > 0.5:
        limits.append(f"Soil pH {ph:.1f} outside ideal {crop.ph[0]}–{crop.ph[1]}")
    texture_score = 1.0 if soil["texture"] in crop.textures else 0.8

    suitability = clamp(temp_score * heat_score * ph_score * texture_score * (1 - 0.6 * flood_risk))
    return {
        "suitability": round(suitability, 3),
        "yield_factor": round(suitability * water_factor, 3),
        "irrigation_mm": round(irrigation_mm, 0),
        "water_need_mm": round(need, 0),
        "water_stress": round(water_stress, 3),
        "flood_risk": round(flood_risk, 3),
        "heat_margin": round(heat_margin, 1),
        "limits": limits,
    }


def best_fit(crop: Crop, season: dict, normals: list[dict], soil: dict, irrigation: str) -> dict:
    """Fit the crop into the best sowing window inside the season (e.g. rice Jun–Sep, not Apr–Jul)."""
    months = season["months"]
    if crop.id == "fallow" or season["dormant"] or crop.months >= len(months):
        return {**season_fit(crop, season, soil, irrigation), "window": season["label"]}

    best, best_key, best_label = None, None, ""
    for start in range(len(months) - crop.months + 1):
        window = season_stats(normals, months[start:start + crop.months])
        fit = season_fit(crop, window, soil, irrigation)
        key = (fit["yield_factor"], fit["suitability"])
        if best_key is None or key > best_key:
            best, best_key, best_label = fit, key, window["label"]
    return {**best, "window": best_label}
