"""API tests with NASA/SoilGrids calls stubbed out, so they run offline."""

from fastapi.testclient import TestClient

from app import main
from tests.test_engine import make_profile


async def fake_build_profile(lat: float, lon: float) -> dict:
    p = make_profile()
    p["location"] = {"lat": lat, "lon": lon, "hemisphere": "north"}
    p["climate"]["trends"].update({"rain_change_pct_per_decade": 0, "annual_rain_mm": 2400, "annual_temp_c": 25,
                                   "hot_months": 0, "years": "2011–2025"})
    p["soil"].update({"estimated": False, "source": "test"})
    p["ndvi"] = {"series": [], "available": False}
    p["sources"] = []
    return p


def client(monkeypatch) -> TestClient:
    monkeypatch.setattr(main, "build_profile", fake_build_profile)
    return TestClient(main.app)


def test_health(monkeypatch):
    assert client(monkeypatch).get("/api/health").json() == {"status": "ok"}


def test_crops(monkeypatch):
    crops = client(monkeypatch).get("/api/crops").json()
    assert any(c["id"] == "lentil" for c in crops)


def test_profile(monkeypatch):
    r = client(monkeypatch).get("/api/profile", params={"lat": 24.7, "lon": 90.4})
    assert r.status_code == 200
    body = r.json()
    assert "crop_matrix" in body and "soil_health_index" in body


def test_recommend(monkeypatch):
    r = client(monkeypatch).post("/api/recommend", json={
        "lat": 24.7, "lon": 90.4, "current": {"warm": "rice", "cool": "wheat"},
        "priorities": {"profit": 2, "water": 1, "soil": 1, "resilience": 1}, "irrigation": "full", "seasons": 4,
        "soil_override": {"phh2o": 5.2},
    })
    assert r.status_code == 200
    body = r.json()
    assert len(body["plan"]) == 4
    assert body["soil"]["phh2o"] == 5.2
    assert body["recommendations"][0]["score"] >= body["recommendations"][-1]["score"]


def test_recommend_rejects_unknown_crop(monkeypatch):
    r = client(monkeypatch).post("/api/recommend", json={"lat": 24.7, "lon": 90.4, "current": {"warm": "banana"}})
    assert r.status_code == 422
