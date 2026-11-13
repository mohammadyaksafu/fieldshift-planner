"""Crop knowledge base.

Values are simplified from FAO ECOCROP (temperature ranges, pH, drought tolerance) and
FAO Irrigation & Drainage Paper 56 (seasonal crop water requirement, ETc). They are
deliberately coarse: the tool compares rotation strategies, it does not forecast yields.

Fields
  season        "warm", "cool" or "any"
  t_opt         optimal mean season temperature range (°C)
  t_abs         absolute mean season temperature limits (°C)
  heat_limit    mean daily max temperature above which yield drops (°C)
  water_mm      seasonal crop water requirement (mm)
  drought_tol   0..1   waterlog_tol 0..1
  n_demand      typical N uptake from soil/fertilizer (kg N/ha)
  n_fix         N left for the next crop by biological fixation (kg N/ha)
  residue       0..1 carbon returned to soil by roots + residue
  profit        0..1 relative gross margin (global rough average)
  months        crop cycle length in months (sowing to harvest)
  winter_hardy  can be sown in autumn and survive a dormant (frozen) winter
"""

from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class Crop:
    id: str
    name: str
    family: str
    season: str
    t_opt: tuple[float, float]
    t_abs: tuple[float, float]
    heat_limit: float
    water_mm: float
    drought_tol: float
    waterlog_tol: float
    ph: tuple[float, float]
    textures: tuple[str, ...]
    n_demand: float
    n_fix: float
    residue: float
    profit: float
    months: int = 4
    winter_hardy: bool = False
    cover: bool = False
    tillage_heavy: bool = False
    note: str = ""

    def to_dict(self) -> dict:
        return asdict(self)

    @property
    def legume(self) -> bool:
        return self.n_fix > 0


ALL_TEXTURES = ("sandy", "loam", "clay")

CROPS: dict[str, Crop] = {c.id: c for c in [
    Crop("rice", "Rice (paddy)", "cereal", "warm", (22, 32), (16, 38), 38, 1100, 0.1, 1.0, (5.0, 7.5), ("clay", "loam"), 100, 0, 0.5, 0.60,
         note="Staple; flooded paddies need lots of water"),
    Crop("wheat", "Wheat", "cereal", "cool", (12, 22), (4, 28), 32, 450, 0.5, 0.2, (6.0, 7.8), ("loam", "clay"), 120, 0, 0.6, 0.55,
         months=5, winter_hardy=True, note="Main cool-season cereal; winter wheat survives frozen winters"),
    Crop("maize", "Maize (corn)", "cereal", "warm", (18, 30), (10, 35), 36, 550, 0.4, 0.2, (5.5, 7.5), ("loam", "clay", "sandy"), 150, 0, 0.7, 0.65,
         note="High yield, high nitrogen demand"),
    Crop("sorghum", "Sorghum", "cereal", "warm", (22, 33), (15, 38), 40, 450, 0.75, 0.4, (5.5, 8.5), ALL_TEXTURES, 90, 0, 0.7, 0.45,
         note="Drought- and heat-tolerant cereal"),
    Crop("millet", "Pearl millet", "cereal", "warm", (24, 34), (18, 40), 42, 350, 0.9, 0.2, (5.0, 8.0), ("sandy", "loam"), 60, 0, 0.6, 0.35,
         months=3, note="Thrives where others fail: hot, dry, sandy soils"),
    Crop("soybean", "Soybean", "legume", "warm", (20, 30), (15, 35), 36, 500, 0.4, 0.3, (6.0, 7.5), ("loam", "clay"), 0, 40, 0.5, 0.60,
         note="Legume: fixes nitrogen for the next crop"),
    Crop("groundnut", "Groundnut (peanut)", "legume", "warm", (22, 30), (18, 36), 37, 500, 0.6, 0.1, (5.5, 7.0), ("sandy", "loam"), 0, 30, 0.3, 0.65,
         tillage_heavy=True, note="Legume cash crop for light soils"),
    Crop("mungbean", "Mungbean", "legume", "warm", (25, 35), (18, 40), 40, 300, 0.7, 0.2, (6.0, 7.5), ("loam", "sandy", "clay"), 0, 30, 0.4, 0.45,
         months=3, note="Short-duration pulse; fits gaps between main crops"),
    Crop("cowpea", "Cowpea", "legume", "warm", (24, 34), (18, 40), 41, 350, 0.8, 0.2, (5.5, 7.5), ALL_TEXTURES, 0, 35, 0.5, 0.45,
         months=3, note="Hardy pulse for hot, dry regions"),
    Crop("cotton", "Cotton", "fiber", "warm", (22, 32), (16, 38), 40, 700, 0.6, 0.2, (5.8, 8.0), ("loam", "clay"), 120, 0, 0.4, 0.70,
         months=6, note="Cash crop; high water and nutrient use"),
    Crop("lentil", "Lentil", "legume", "cool", (15, 25), (6, 30), 32, 300, 0.7, 0.1, (6.0, 8.0), ("loam", "clay"), 0, 35, 0.3, 0.55,
         note="Low-water pulse; restores soil nitrogen"),
    Crop("chickpea", "Chickpea", "legume", "cool", (15, 27), (6, 32), 34, 300, 0.8, 0.1, (6.0, 8.5), ("loam", "clay"), 0, 40, 0.3, 0.55,
         note="Deep-rooted, drought-tolerant pulse"),
    Crop("mustard", "Mustard / Rapeseed", "brassica", "cool", (10, 22), (3, 28), 30, 350, 0.6, 0.2, (5.5, 8.0), ("loam", "clay", "sandy"), 80, 0, 0.4, 0.50,
         winter_hardy=True, note="Oilseed; brassica roots break cereal disease cycles"),
    Crop("potato", "Potato", "solanaceae", "cool", (14, 22), (7, 27), 29, 500, 0.3, 0.1, (5.0, 6.5), ("sandy", "loam"), 150, 0, 0.2, 0.80,
         tillage_heavy=True, note="High value but heavy tillage and nutrient use"),
    Crop("cover_cool", "Cover crop: rye + vetch", "cover", "cool", (8, 22), (-2, 28), 30, 250, 0.6, 0.3, (5.0, 8.0), ALL_TEXTURES, 0, 50, 1.0, 0.0,
         months=5, winter_hardy=True, cover=True, note="Protects bare soil, adds carbon and nitrogen"),
    Crop("cover_warm", "Cover crop: sunn hemp", "cover", "warm", (22, 34), (16, 40), 40, 350, 0.7, 0.2, (5.0, 7.5), ALL_TEXTURES, 0, 60, 1.0, 0.05,
         months=3, cover=True, note="Fast-growing green manure for hot seasons"),
    Crop("fallow", "Fallow (bare)", "fallow", "any", (-50, 60), (-60, 70), 99, 0, 1.0, 1.0, (0, 14), ALL_TEXTURES, 0, 0, 0.0, 0.0,
         months=6, note="No crop: no income and soil left exposed"),
]}


def get(crop_id: str) -> Crop:
    return CROPS[crop_id]
