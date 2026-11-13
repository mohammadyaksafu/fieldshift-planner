"""Engine tests use a synthetic NASA POWER-style profile so they run offline."""

import datetime as dt

from app.engine import crops as crop_db
from app.engine.climate import season_stats
from app.engine.rotations import crop_matrix, recommend, soil_health_start
from app.engine.scoring import best_fit, season_fit, trapezoid
from app.services.profile import planning_calendar, season_months

# Monsoon-like climate: hot wet summer, mild dry winter (roughly Bangladesh).
TEMPS = [18, 21, 26, 29, 29, 29, 29, 29, 29, 27, 23, 19]
RAIN = [8, 25, 55, 130, 300, 450, 500, 420, 330, 160, 30, 10]
WET = [0.5, 0.45, 0.45, 0.55, 0.7, 0.85, 0.9, 0.9, 0.85, 0.75, 0.6, 0.55]


def make_profile(temps=TEMPS, rain=RAIN, wet=WET, soil=None) -> dict:
    normals = [
        {"month": m + 1, "label": "", "T2M": t, "T2M_MAX": t + 9, "T2M_MIN": t - 8, "T2M_RANGE": 9,
         "T2M_DAYMAX": t + 4.5, "PRECTOTCORR": r, "GWETROOT": w, "ALLSKY_SFC_SW_DWN": 18, "RH2M": 70}
        for m, (t, r, w) in enumerate(zip(temps, rain, wet))
    ]
    seasons = {name: season_stats(normals, months) for name, months in season_months(24).items()}
    return {
        "climate": {"normals": normals, "trends": {"warming_c_per_decade": 0.2, "rain_variability_cv": 0.1}},
        "seasons": seasons,
        "soil": soil or {"clay": 30, "sand": 30, "silt": 40, "soc": 12, "phh2o": 6.5, "nitrogen": 1.2, "texture": "loam"},
    }


def test_trapezoid_edges():
    assert trapezoid(25, 10, 20, 30, 40) == 1.0
    assert trapezoid(10, 10, 20, 30, 40) == 0.0
    assert trapezoid(15, 10, 20, 30, 40) == 0.5


def test_wheat_does_not_fit_hot_monsoon():
    p = make_profile()
    fit = season_fit(crop_db.get("wheat"), p["seasons"]["warm"], p["soil"], "full")
    assert fit["suitability"] < 0.2


def test_best_window_avoids_dry_months():
    p = make_profile()
    # Rainfed rice in the cool season only works if the window catches the October rains.
    fit = best_fit(crop_db.get("rice"), p["seasons"]["cool"], p["climate"]["normals"], p["soil"], "none")
    assert fit["window"].startswith("Oct")
    monsoon = best_fit(crop_db.get("rice"), p["seasons"]["warm"], p["climate"]["normals"], p["soil"], "none")
    assert monsoon["yield_factor"] > 0.9


def test_no_irrigation_dry_season_stresses_crop():
    p = make_profile()
    wet = season_fit(crop_db.get("rice"), p["seasons"]["cool"], p["soil"], "full")
    dry = season_fit(crop_db.get("rice"), p["seasons"]["cool"], p["soil"], "none")
    assert wet["irrigation_mm"] > 0 and dry["irrigation_mm"] == 0
    assert dry["yield_factor"] < wet["yield_factor"]


def test_dormant_winter_only_allows_hardy_crops():
    cold = [-10, -8, 0, 9, 16, 22, 24, 23, 18, 11, 2, -6]
    p = make_profile(temps=cold, rain=[25, 25, 50, 90, 120, 120, 100, 100, 80, 60, 40, 30])
    assert p["seasons"]["cool"]["dormant"]
    assert season_fit(crop_db.get("maize"), p["seasons"]["cool"], p["soil"], "none")["suitability"] == 0
    assert season_fit(crop_db.get("wheat"), p["seasons"]["cool"], p["soil"], "none")["suitability"] > 0.5


def test_soil_health_seeded_from_carbon():
    assert soil_health_start({"soc": 25, "phh2o": 6.5}) > soil_health_start({"soc": 5, "phh2o": 6.5})
    assert soil_health_start({"soc": 12, "phh2o": 4.8}) < soil_health_start({"soc": 12, "phh2o": 6.5})


def test_recommendations_beat_rice_monoculture():
    p = make_profile()
    plan = planning_calendar(24, 4, today=dt.date(2026, 10, 16))
    out = recommend(p, plan, current={"warm": "rice", "cool": "rice"},
                    weights={"profit": 1, "water": 1, "soil": 1, "resilience": 1}, irrigation="full")
    recs = out["recommendations"]
    assert 1 <= len(recs) <= 5
    assert recs == sorted(recs, key=lambda r: -r["score"])
    best = recs[0]
    assert best["score"] > out["baseline"]["score"]
    assert best["stats"]["irrigation_mm_total"] < out["baseline"]["stats"]["irrigation_mm_total"]
    assert best["stats"]["soil_health_end"] > out["baseline"]["stats"]["soil_health_end"]
    assert best["explanations"]
    # No crop three times in a row, and options are not mere reorderings of each other.
    for r in recs:
        c = r["crops"]
        assert not any(c[i] == c[i + 1] == c[i + 2] for i in range(len(c) - 2))
    assert len({tuple(sorted(r["crops"])) for r in recs}) == len(recs)


def test_priorities_change_ranking():
    p = make_profile()
    plan = planning_calendar(24, 4, today=dt.date(2026, 10, 16))
    kw = dict(current={"warm": "rice", "cool": "fallow"}, irrigation="limited")
    profit_first = recommend(p, plan, weights={"profit": 5, "water": 0, "soil": 0, "resilience": 0}, **kw)
    soil_first = recommend(p, plan, weights={"profit": 0, "water": 0, "soil": 5, "resilience": 0}, **kw)
    assert profit_first["recommendations"][0]["metrics"]["profit"] >= soil_first["recommendations"][0]["metrics"]["profit"]
    assert soil_first["recommendations"][0]["metrics"]["soil"] >= profit_first["recommendations"][0]["metrics"]["soil"]


def test_planning_calendar_hemispheres():
    north = planning_calendar(24, 4, today=dt.date(2026, 10, 16))
    assert [s["season"] for s in north] == ["cool", "warm", "cool", "warm"]
    assert north[0]["start"] == "2026-10-01"
    south = planning_calendar(-20, 2, today=dt.date(2026, 10, 16))
    assert south[0]["season"] == "warm"
    late = planning_calendar(24, 2, today=dt.date(2026, 12, 20))
    assert late[0]["start"] == "2027-04-01"


def test_crop_matrix_covers_all_crops():
    p = make_profile()
    m = crop_matrix(p, "limited")
    assert set(m) == {"warm", "cool"}
    assert len(m["warm"]) == len(crop_db.CROPS) - 1
