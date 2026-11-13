"""FieldShift Planner API.

Run:  uvicorn app.main:app --reload --port 8000
Docs: http://localhost:8000/docs
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS
from .engine import crops as crop_db
from .engine.rotations import crop_matrix, recommend, soil_health_start
from .schemas import RecommendRequest
from .services.nasa_power import PowerError
from .services.profile import build_profile, planning_calendar

app = FastAPI(
    title="FieldShift Planner API",
    version="1.0.0",
    description="Crop rotation decision support powered by NASA Earth observations (NASA Space Apps 2026 – Field Shift).",
)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])


async def _profile(lat: float, lon: float) -> dict:
    try:
        return await build_profile(lat, lon)
    except PowerError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/crops")
async def list_crops():
    return [c.to_dict() for c in crop_db.CROPS.values()]


@app.get("/api/profile")
async def field_profile(
    lat: float = Query(..., ge=-60, le=75),
    lon: float = Query(..., ge=-180, le=180),
    irrigation: str = Query("limited", pattern="^(none|limited|full)$"),
):
    profile = await _profile(lat, lon)
    profile["soil_health_index"] = soil_health_start(profile["soil"])
    profile["crop_matrix"] = crop_matrix(profile, irrigation)
    return profile


@app.post("/api/recommend")
async def recommend_rotations(req: RecommendRequest):
    profile = await _profile(req.lat, req.lon)
    if req.soil_override:
        override = req.soil_override.model_dump(exclude_none=True)
        profile["soil"] = {**profile["soil"], **override, "estimated": False if override else profile["soil"]["estimated"]}

    plan = planning_calendar(req.lat, req.seasons)
    result = recommend(
        profile,
        plan,
        current=req.current.model_dump(),
        weights=req.priorities.model_dump(),
        irrigation=req.irrigation,
    )
    return {
        "plan": plan,
        "soil": profile["soil"],
        "seasons": profile["seasons"],
        "trends": profile["climate"]["trends"],
        **result,
    }
