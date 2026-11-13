import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getCrops, getProfile, getRecommendations } from "./api";
import { PRESETS } from "./components/MapPicker";
import type { Crop, FarmInput, Profile, RecommendResponse } from "./types";

export const DEFAULT_INPUT: FarmInput = {
  lat: PRESETS[0].lat,
  lon: PRESETS[0].lon,
  current: { warm: "rice", cool: "rice" },
  irrigation: "full",
  seasons: 4,
  priorities: { profit: 3, water: 3, soil: 3, resilience: 3 },
  soilOverride: {},
};

interface PlannerState {
  crops: Crop[];
  input: FarmInput;
  setInput: (i: FarmInput) => void;
  placeName: string;
  setPlaceName: (n: string) => void;
  profile: Profile | null;
  result: RecommendResponse | null;
  loading: boolean;
  error: string;
  analyze: () => Promise<boolean>;
}

const Ctx = createContext<PlannerState | null>(null);
const KEY = "fieldshift:v1";

function load<T>(field: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw)[field] ?? fallback) : fallback;
  } catch {
    return fallback;
  }
}

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [input, setInput] = useState<FarmInput>(() => load("input", DEFAULT_INPUT));
  const [placeName, setPlaceName] = useState<string>(() => load("placeName", PRESETS[0].name));
  const [profile, setProfile] = useState<Profile | null>(() => load("profile", null));
  const [result, setResult] = useState<RecommendResponse | null>(() => load("result", null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getCrops().then(setCrops).catch(() => setError("Can't reach the FieldShift API. Is the backend running on port 8000?"));
  }, []);

  // Keep the last analysis across page reloads within this browser tab.
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ input, placeName, profile, result }));
    } catch {
      /* storage full or blocked – not critical */
    }
  }, [input, placeName, profile, result]);

  const analyze = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [p, r] = await Promise.all([getProfile(input.lat, input.lon, input.irrigation), getRecommendations(input)]);
      setProfile(p);
      setResult(r);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [input]);

  return (
    <Ctx.Provider value={{ crops, input, setInput, placeName, setPlaceName, profile, result, loading, error, analyze }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePlanner() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePlanner must be used inside PlannerProvider");
  return ctx;
}
