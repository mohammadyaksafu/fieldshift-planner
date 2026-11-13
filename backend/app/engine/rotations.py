"""Generates and ranks multi-season crop rotations for a field profile."""

import itertools

from . import crops as crop_db
from .crops import Crop
from .scoring import best_fit, clamp

MAX_COMBINATIONS = 60_000
MIN_SUITABILITY = 0.35
MIN_YIELD = 0.4
METRICS = ("profit", "water", "soil", "resilience")


def soil_health_start(soil: dict) -> float:
    """Relative Soil Health Index (0–100) seeded from organic carbon and pH."""
    shi = clamp(30 + soil["soc"] * 2, 20, 80)
    if soil["phh2o"] < 5.5 or soil["phh2o"] > 8.0:
        shi -= 5
    return round(shi, 1)


def _shi_delta(crop: Crop, prev: Crop | None, yield_factor: float) -> float:
    d = 3 * crop.residue * (0.5 + 0.5 * yield_factor)
    if crop.cover:
        d += 4
    elif crop.legume:
        d += 2
    if crop.n_demand >= 120:
        d -= 1.5
    if crop.tillage_heavy:
        d -= 2
    if crop.id == "fallow":
        d -= 1.5
    if prev and prev.family == crop.family and crop.family not in ("fallow", "cover"):
        d -= 2.5
        if prev.id == crop.id:
            d -= 1.5
    return d


def evaluate(seq: list[Crop], fits: list[dict], plan: list[dict], ctx: dict) -> dict:
    trends = ctx["trends"]
    irrigation = ctx["irrigation"]
    shi = ctx["shi_start"]
    trajectory = [round(shi, 1)]
    n_saved = 0.0
    irrigation_total = 0.0
    income = 0.0
    risks = []
    seasons_out = []
    prev, prev_fit = None, None

    for crop, fit, slot in zip(seq, fits, plan):
        yf = fit["yield_factor"]
        shi = clamp(shi + _shi_delta(crop, prev, yf), 0, 100)
        trajectory.append(round(shi, 1))

        credit = 0.0
        if prev and prev.legume and crop.n_demand > 0:
            fixed = prev.n_fix if prev.cover else prev.n_fix * (0.5 + 0.5 * prev_fit["yield_factor"])
            credit = min(fixed, crop.n_demand)
            n_saved += credit

        irrigation_total += fit["irrigation_mm"]
        income += crop.profit * yf - (0.05 if crop.cover else 0.0)

        notes = list(fit["limits"])
        if crop.id != "fallow":
            risk = 1 - fit["suitability"] * (1 - 0.5 * fit["water_stress"])
            if trends["warming_c_per_decade"] > 0.25 and fit["heat_margin"] < 3:
                risk += 0.1
                notes.append(f"Warming trend (+{trends['warming_c_per_decade']}°C/decade) is narrowing the heat margin")
            if trends["rain_variability_cv"] > 0.2 and crop.drought_tol < 0.5 and irrigation != "full":
                risk += 0.1
                notes.append("Rainfall varies a lot year to year; this crop is drought-sensitive")
            risks.append(clamp(risk))
        if credit >= 10:
            notes.append(f"Uses ~{credit:.0f} kg N/ha left by the previous {prev.name.lower()}")
        if prev and prev.family == crop.family and crop.family not in ("fallow", "cover"):
            notes.append(f"Same crop family as last season ({crop.family}): pest and disease build-up")

        seasons_out.append({
            **slot,
            "crop": {"id": crop.id, "name": crop.name, "family": crop.family, "note": crop.note, "cover": crop.cover},
            "suitability": fit["suitability"],
            "yield_factor": fit["yield_factor"],
            "irrigation_mm": fit["irrigation_mm"],
            "water_need_mm": fit["water_need_mm"],
            "water_stress": fit["water_stress"],
            "flood_risk": fit["flood_risk"],
            "window": fit["window"],
            "n_credit_kg": round(credit, 0),
            "notes": notes,
        })
        prev, prev_fit = crop, fit

    n = len(seq)
    families = {c.family for c in seq if c.family != "fallow"}
    diversity = len(families) / n
    profit = clamp((income / n + n_saved * 0.002 / n) / 0.75)
    water = 1 - clamp(irrigation_total / n / 700)
    soil = clamp(0.5 + (trajectory[-1] - trajectory[0]) / 24)
    resilience = clamp(1 - (sum(risks) / len(risks) if risks else 0.5) + 0.15 * diversity - 0.1)

    metrics = {"profit": profit, "water": water, "soil": soil, "resilience": resilience}
    w = ctx["weights"]
    total = sum(metrics[k] * w[k] for k in METRICS) / (sum(w.values()) or 1)

    return {
        "crops": [c.id for c in seq],
        "name": " → ".join(c.name.split(" (")[0].split(":")[0] if not c.cover else "Cover crop" for c in seq),
        "score": round(total * 100, 1),
        "metrics": {k: round(v * 100, 1) for k, v in metrics.items()},
        "stats": {
            "irrigation_mm_total": round(irrigation_total, 0),
            "n_saved_kg": round(n_saved, 0),
            "soil_health_start": trajectory[0],
            "soil_health_end": trajectory[-1],
            "soil_trajectory": trajectory,
            "crop_families": len(families),
            "income_index": round(income / n * 100, 1),
        },
        "seasons": seasons_out,
    }


def _explain(rot: dict, base: dict) -> list[str]:
    out = []
    s, b = rot["stats"], base["stats"]
    if b["irrigation_mm_total"] > 0 and s["irrigation_mm_total"] < b["irrigation_mm_total"] - 20:
        saved = b["irrigation_mm_total"] - s["irrigation_mm_total"]
        out.append(f"Saves ~{saved:.0f} mm of irrigation water ({saved / b['irrigation_mm_total'] * 100:.0f}% less) vs. your current practice")
    elif s["irrigation_mm_total"] > b["irrigation_mm_total"] + 20:
        out.append(f"Needs ~{s['irrigation_mm_total'] - b['irrigation_mm_total']:.0f} mm more irrigation than your current practice")
    if s["n_saved_kg"] >= 10:
        out.append(f"Legumes/cover crops supply ~{s['n_saved_kg']:.0f} kg N/ha, cutting fertilizer cost")
    dsoil = (s["soil_health_end"] - s["soil_health_start"]) - (b["soil_health_end"] - b["soil_health_start"])
    if dsoil > 1:
        out.append(f"Soil Health Index ends {dsoil:.0f} points higher than with your current practice")
    elif dsoil < -1:
        out.append(f"Soil Health Index ends {-dsoil:.0f} points lower than your current practice")
    if s["crop_families"] > b["crop_families"]:
        out.append(f"{s['crop_families']} crop families instead of {b['crop_families']}: breaks pest and disease cycles")
    if rot["metrics"]["profit"] > base["metrics"]["profit"] + 3:
        out.append("Higher expected income than your current practice")
    elif rot["metrics"]["profit"] < base["metrics"]["profit"] - 3:
        out.append("Lower short-term income than your current practice: a trade-off for soil and water")
    return out


def _candidates(season: dict, normals: list[dict], soil: dict, irrigation: str, k: int) -> list[tuple[Crop, dict]]:
    # Any crop whose temperature/water needs fit this season qualifies – in tropical highlands a
    # "cool-season" crop like wheat can do well in the warm half of the year, and vice versa.
    scored = []
    for crop in crop_db.CROPS.values():
        if crop.id == "fallow":
            continue
        fit = best_fit(crop, season, normals, soil, irrigation)
        if fit["suitability"] >= MIN_SUITABILITY and fit["yield_factor"] >= MIN_YIELD:
            scored.append((crop, fit))
    scored.sort(key=lambda cf: cf[1]["yield_factor"] * (0.6 + cf[0].profit), reverse=True)
    top = scored[:k]
    # Always keep the best legume and best cover crop in the pool so soil-building options are explored.
    for pred in (lambda c: c.legume and not c.cover, lambda c: c.cover):
        best = next((cf for cf in scored if pred(cf[0])), None)
        if best and best not in top:
            top.append(best)
    # Leaving land fallow is always an option (e.g. a rainless dry season without irrigation).
    fallow = crop_db.get("fallow")
    top.append((fallow, best_fit(fallow, season, normals, soil, irrigation)))
    return top


def recommend(profile: dict, plan: list[dict], current: dict[str, str], weights: dict[str, float],
              irrigation: str, top_n: int = 5) -> dict:
    soil = profile["soil"]
    seasons = profile["seasons"]
    normals = profile["climate"]["normals"]
    ctx = {
        "trends": profile["climate"]["trends"],
        "irrigation": irrigation,
        "weights": {k: max(0.0, float(weights.get(k, 1))) for k in METRICS},
        "shi_start": soil_health_start(soil),
    }

    # Baseline = what the farmer does today, repeated.
    base_seq, base_fits = [], []
    for slot in plan:
        crop = crop_db.get(current.get(slot["season"], "fallow"))
        base_seq.append(crop)
        base_fits.append(best_fit(crop, seasons[slot["season"]], normals, soil, irrigation))
    baseline = evaluate(base_seq, base_fits, plan, ctx)

    n = len(plan)
    # Pools hold k top crops + best legume + best cover + fallow; keep the search space bounded.
    k = max(2, min(8, int(MAX_COMBINATIONS ** (1 / n)) - 3))
    pools = {name: _candidates(seasons[name], normals, soil, irrigation, k) for name in seasons}

    results = []
    for combo in itertools.product(*[pools[slot["season"]] for slot in plan]):
        seq = [c for c, _ in combo]
        # Skip three of the same crop in a row.
        if any(seq[i].id == seq[i + 1].id == seq[i + 2].id for i in range(n - 2)):
            continue
        results.append(evaluate(seq, [f for _, f in combo], plan, ctx))

    results.sort(key=lambda r: r["score"], reverse=True)
    picked: list[dict] = []
    for r in results:
        # Prefer options that differ meaningfully (at least 2 seasons) from those already picked.
        if all(sum(a != b for a, b in zip(r["crops"], p["crops"])) >= min(2, n)
               and sorted(r["crops"]) != sorted(p["crops"]) for p in picked):
            picked.append(r)
        if len(picked) == top_n:
            break

    for r in picked:
        r["explanations"] = _explain(r, baseline)
        r["vs_baseline"] = round(r["score"] - baseline["score"], 1)

    return {
        "baseline": baseline,
        "recommendations": picked,
        "evaluated": len(results),
    }


def crop_matrix(profile: dict, irrigation: str) -> dict:
    """Suitability of every crop in every season – used for the 'what grows here' table."""
    soil, normals = profile["soil"], profile["climate"]["normals"]
    out = {}
    for name, season in profile["seasons"].items():
        rows = []
        for crop in crop_db.CROPS.values():
            if crop.id == "fallow":
                continue
            f = best_fit(crop, season, normals, soil, irrigation)
            rows.append({"crop": crop.id, "name": crop.name, "family": crop.family, "suitability": f["suitability"],
                         "yield_factor": f["yield_factor"], "irrigation_mm": f["irrigation_mm"],
                         "window": f["window"], "limits": f["limits"]})
        out[name] = sorted(rows, key=lambda x: (-x["yield_factor"], -x["suitability"]))
    return out
