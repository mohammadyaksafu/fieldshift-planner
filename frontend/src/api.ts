import type { Crop, FarmInput, Profile, RecommendResponse } from "./types";

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* keep status text */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const getCrops = () => request<Crop[]>("/api/crops");

export const getProfile = (lat: number, lon: number, irrigation: string) =>
  request<Profile>(`/api/profile?lat=${lat}&lon=${lon}&irrigation=${irrigation}`);

export const getRecommendations = (input: FarmInput) => {
  const override = Object.fromEntries(Object.entries(input.soilOverride).filter(([, v]) => v !== undefined));
  return request<RecommendResponse>("/api/recommend", {
    method: "POST",
    body: JSON.stringify({
      lat: input.lat,
      lon: input.lon,
      current: input.current,
      irrigation: input.irrigation,
      seasons: input.seasons,
      priorities: input.priorities,
      soil_override: Object.keys(override).length ? override : null,
    }),
  });
};

export interface GeocodeHit {
  display_name: string;
  lat: string;
  lon: string;
}

// OpenStreetMap Nominatim – only called when the user searches for a place.
export async function geocode(q: string): Promise<GeocodeHit[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Place search failed");
  return res.json();
}
