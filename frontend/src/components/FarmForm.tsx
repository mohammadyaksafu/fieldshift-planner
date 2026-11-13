import { useState } from "react";
import type { Crop, FarmInput, Irrigation, Priorities, SeasonName } from "../types";

interface Props {
  crops: Crop[];
  input: FarmInput;
  onChange: (next: FarmInput) => void;
}

const PRIORITIES: { key: keyof Priorities; label: string; icon: string; hint: string }[] = [
  { key: "profit", label: "Income", icon: "💰", hint: "Expected earnings from the crops" },
  { key: "water", label: "Save water", icon: "💧", hint: "Less irrigation pumping" },
  { key: "soil", label: "Soil health", icon: "🌱", hint: "Organic matter, nitrogen, fewer pests" },
  { key: "resilience", label: "Low risk", icon: "🛡️", hint: "Crops that tolerate heat, drought and floods here" },
];

const IRRIGATION: { value: Irrigation; label: string; icon: string; text: string }[] = [
  { value: "none", label: "Rain only", icon: "🌧️", text: "No pumps or canals" },
  { value: "limited", label: "Some", icon: "🚿", text: "Can irrigate part of the need" },
  { value: "full", label: "Full", icon: "🚰", text: "Reliable irrigation" },
];

const LEVEL = ["Ignore", "Low", "Some", "Medium", "High", "Top"];

export default function FarmForm({ crops, input, onChange }: Props) {
  const [advanced, setAdvanced] = useState(false);
  const set = (patch: Partial<FarmInput>) => onChange({ ...input, ...patch });

  return (
    <div className="farm-form">
      <div className="form-block">
        <h3>🌾 What do you grow now?</h3>
        <div className="two-col">
          {(["warm", "cool"] as SeasonName[]).map((s) => (
            <label key={s} className="field">
              <span>{s === "warm" ? "☀️ Warmer half of the year" : "❄️ Cooler half of the year"}</span>
              <select value={input.current[s]} onChange={(e) => set({ current: { ...input.current, [s]: e.target.value } })}>
                {crops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          ))}
        </div>
      </div>

      <div className="form-block">
        <h3>💧 Irrigation available</h3>
        <div className="tiles" role="radiogroup">
          {IRRIGATION.map((o) => (
            <button
              type="button"
              key={o.value}
              role="radio"
              aria-checked={input.irrigation === o.value}
              className={`tile ${input.irrigation === o.value ? "on" : ""}`}
              onClick={() => set({ irrigation: o.value })}
            >
              <span className="tile-icon">{o.icon}</span>
              <b>{o.label}</b>
              <small>{o.text}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="form-block">
        <h3>🎯 What matters most to you?</h3>
        <div className="sliders">
          {PRIORITIES.map(({ key, label, icon, hint }) => (
            <label key={key} className="slider" title={hint}>
              <span className="slider-label"><span>{icon} {label}</span><em className={`lvl lvl-${input.priorities[key]}`}>{LEVEL[input.priorities[key]]}</em></span>
              <input
                type="range"
                min={0}
                max={5}
                step={1}
                value={input.priorities[key]}
                style={{ "--p": `${input.priorities[key] * 20}%` } as React.CSSProperties}
                onChange={(e) => set({ priorities: { ...input.priorities, [key]: +e.target.value } })}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="form-block">
        <h3>📅 Plan ahead</h3>
        <div className="segmented">
          {[2, 4, 6].map((n) => (
            <button type="button" key={n} className={input.seasons === n ? "on" : ""} onClick={() => set({ seasons: n })}>
              {n / 2} year{n > 2 ? "s" : ""} <small>{n} seasons</small>
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="link" onClick={() => setAdvanced(!advanced)} aria-expanded={advanced}>
        {advanced ? "▾" : "▸"} I have soil test results (optional)
      </button>
      {advanced && (
        <div className="form-block advanced three-col">
          <label className="field">
            <span>Soil pH</span>
            <input
              type="number" step="0.1" min="3" max="10" placeholder="auto"
              value={input.soilOverride.phh2o ?? ""}
              onChange={(e) => set({ soilOverride: { ...input.soilOverride, phh2o: e.target.value ? +e.target.value : undefined } })}
            />
          </label>
          <label className="field">
            <span>Organic carbon (g/kg)</span>
            <input
              type="number" step="0.5" min="0" placeholder="auto"
              value={input.soilOverride.soc ?? ""}
              onChange={(e) => set({ soilOverride: { ...input.soilOverride, soc: e.target.value ? +e.target.value : undefined } })}
            />
          </label>
          <label className="field">
            <span>Soil texture</span>
            <select
              value={input.soilOverride.texture ?? ""}
              onChange={(e) => set({ soilOverride: { ...input.soilOverride, texture: (e.target.value || undefined) as FarmInput["soilOverride"]["texture"] } })}
            >
              <option value="">Auto (soil map)</option>
              <option value="sandy">Sandy (light)</option>
              <option value="loam">Loam (medium)</option>
              <option value="clay">Clay (heavy)</option>
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
