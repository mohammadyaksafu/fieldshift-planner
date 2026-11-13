export type SeasonName = "warm" | "cool";
export type Irrigation = "none" | "limited" | "full";

export interface Priorities {
  profit: number;
  water: number;
  soil: number;
  resilience: number;
}

export interface Crop {
  id: string;
  name: string;
  family: string;
  season: SeasonName | "any";
  note: string;
  cover: boolean;
}

export interface MonthlyNormal {
  month: number;
  label: string;
  T2M: number | null;
  T2M_DAYMAX: number | null;
  T2M_MIN: number | null;
  PRECTOTCORR: number | null;
  GWETROOT: number | null;
}

export interface Trends {
  warming_c_per_decade: number;
  rain_change_pct_per_decade: number;
  rain_variability_cv: number;
  annual_rain_mm: number | null;
  annual_temp_c: number | null;
  hot_months: number;
  years: string;
}

export interface SeasonStats {
  months: number[];
  label: string;
  t_mean: number;
  t_max: number;
  t_coldest: number;
  rain_mm: number;
  soil_wetness: number;
  dormant: boolean;
}

export interface Soil {
  clay: number;
  sand: number;
  silt: number;
  soc: number;
  phh2o: number;
  nitrogen: number;
  texture: "sandy" | "loam" | "clay";
  estimated: boolean;
  source: string;
}

export interface MatrixRow {
  crop: string;
  name: string;
  family: string;
  suitability: number;
  yield_factor: number;
  irrigation_mm: number;
  window: string;
  limits: string[];
}

export interface Source {
  name: string;
  use: string;
  url: string;
}

export interface Profile {
  location: { lat: number; lon: number; hemisphere: string };
  climate: { normals: MonthlyNormal[]; annual: { year: number; t_mean: number; rain_mm: number }[]; trends: Trends };
  seasons: Record<SeasonName, SeasonStats>;
  soil: Soil;
  ndvi: { series: { date: string; ndvi: number }[]; mean: number | null; peak: number | null; low: number | null; available: boolean };
  sources: Source[];
  soil_health_index: number;
  crop_matrix: Record<SeasonName, MatrixRow[]>;
}

export interface PlanSlot {
  index: number;
  season: SeasonName;
  start: string;
  label: string;
}

export interface RotationSeason extends PlanSlot {
  crop: { id: string; name: string; family: string; note: string; cover: boolean };
  suitability: number;
  yield_factor: number;
  irrigation_mm: number;
  water_need_mm: number;
  water_stress: number;
  flood_risk: number;
  window: string;
  n_credit_kg: number;
  notes: string[];
}

export interface Rotation {
  crops: string[];
  name: string;
  score: number;
  metrics: Priorities;
  stats: {
    irrigation_mm_total: number;
    n_saved_kg: number;
    soil_health_start: number;
    soil_health_end: number;
    soil_trajectory: number[];
    crop_families: number;
    income_index: number;
  };
  seasons: RotationSeason[];
  explanations?: string[];
  vs_baseline?: number;
}

export interface RecommendResponse {
  plan: PlanSlot[];
  soil: Soil;
  seasons: Record<SeasonName, SeasonStats>;
  trends: Trends;
  baseline: Rotation;
  recommendations: Rotation[];
  evaluated: number;
}

export interface FarmInput {
  lat: number;
  lon: number;
  current: Record<SeasonName, string>;
  irrigation: Irrigation;
  seasons: number;
  priorities: Priorities;
  soilOverride: { phh2o?: number; soc?: number; texture?: Soil["texture"] };
}
