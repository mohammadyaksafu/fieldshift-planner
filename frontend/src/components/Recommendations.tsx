import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { FAMILY_COLORS, FAMILY_ICONS, palette as pal, tooltipStyle } from "../theme";
import type { Priorities, RecommendResponse, Rotation } from "../types";
import { Meter } from "./ProfilePanel";
import { Counter } from "./Visuals";

const METRIC_LABELS: Record<keyof Priorities, string> = {
  profit: "Income",
  water: "Water saving",
  soil: "Soil health",
  resilience: "Low risk",
};

const shortName = (s: Rotation["seasons"][number]) => (s.crop.cover ? "Cover crop" : s.crop.name.split(" (")[0]);

export function CropChips({ rotation }: { rotation: Rotation }) {
  return (
    <div className="chips">
      {rotation.seasons.map((s, i) => (
        <span key={i} className="crop-chip" style={{ borderColor: FAMILY_COLORS[s.crop.family], background: `${FAMILY_COLORS[s.crop.family]}1f` }}>
          {FAMILY_ICONS[s.crop.family]} {shortName(s)}
        </span>
      ))}
    </div>
  );
}

export function OptionPicker({ data, selected, onSelect }: { data: RecommendResponse; selected: number; onSelect: (i: number) => void }) {
  return (
    <div className="options">
      {data.recommendations.map((r, i) => (
        <button
          key={r.crops.join("-")}
          type="button"
          className={`option glass ${i === selected ? "selected" : ""}`}
          style={{ animationDelay: `${i * 90}ms` }}
          onClick={() => onSelect(i)}
        >
          <span className="option-top">
            <span className="rank">{i === 0 ? "🏆 Best match" : `Option ${i + 1}`}</span>
            <span className={`delta ${(r.vs_baseline ?? 0) >= 0 ? "up" : "down"}`}>
              {(r.vs_baseline ?? 0) >= 0 ? "▲" : "▼"} {Math.abs(r.vs_baseline ?? 0).toFixed(0)}
            </span>
          </span>
          <span className="score">{r.score.toFixed(0)}<small>/100</small></span>
          <span className="score-bar"><span style={{ width: `${r.score}%` }} /></span>
          <CropChips rotation={r} />
        </button>
      ))}
      <div className="option glass baseline">
        <span className="option-top"><span className="rank">📌 Today</span></span>
        <span className="score">{data.baseline.score.toFixed(0)}<small>/100</small></span>
        <span className="score-bar base"><span style={{ width: `${data.baseline.score}%` }} /></span>
        <CropChips rotation={data.baseline} />
      </div>
    </div>
  );
}

export function RotationDetail({ data, rot, index }: { data: RecommendResponse; rot: Rotation; index: number }) {
  const base = data.baseline;
  const radarData = (Object.keys(METRIC_LABELS) as (keyof Priorities)[]).map((k) => ({
    metric: METRIC_LABELS[k],
    Recommended: rot.metrics[k],
    Today: base.metrics[k],
  }));
  const soilData = rot.stats.soil_trajectory.map((v, i) => ({
    step: i === 0 ? "Today" : data.plan[i - 1].label,
    Recommended: v,
    Today: base.stats.soil_trajectory[i],
  }));
  const waterData = rot.seasons.map((s, i) => ({
    season: s.label,
    Recommended: s.irrigation_mm,
    Today: base.seasons[i]?.irrigation_mm ?? 0,
  }));
  const saved = base.stats.irrigation_mm_total - rot.stats.irrigation_mm_total;

  return (
    <div className="detail" id="plan-print" key={rot.crops.join("-")}>
      <div className="detail-head">
        <div>
          <span className="eyebrow">{index === 0 ? "🏆 Best match" : `Option ${index + 1}`} · {data.plan[0].label} → {data.plan[data.plan.length - 1].label}</span>
          <h2 className="rotation-title">{rot.seasons.map((s, i) => (
            <span key={i}>{i > 0 && <i className="arrow">→</i>}{shortName(s)}</span>
          ))}</h2>
        </div>
        <button type="button" className="btn ghost" onClick={() => window.print()}>🖨️ Print plan</button>
      </div>

      <div className="impact">
        <div className="impact-card glass">
          <span className="impact-icon">💧</span>
          <strong>{saved >= 0 ? <Counter to={saved} prefix="−" suffix=" mm" /> : <Counter to={-saved} prefix="+" suffix=" mm" />}</strong>
          <span>irrigation vs. today</span>
        </div>
        <div className="impact-card glass">
          <span className="impact-icon">🌿</span>
          <strong><Counter to={rot.stats.n_saved_kg} prefix="+" suffix=" kg" /></strong>
          <span>free nitrogen per hectare</span>
        </div>
        <div className="impact-card glass">
          <span className="impact-icon">🌱</span>
          <strong><Counter to={rot.stats.soil_health_end} decimals={1} /></strong>
          <span>soil health (today ends at {base.stats.soil_health_end})</span>
        </div>
        <div className="impact-card glass">
          <span className="impact-icon">🧬</span>
          <strong><Counter to={rot.stats.crop_families} /> families</strong>
          <span>crop diversity (today: {base.stats.crop_families})</span>
        </div>
      </div>

      {rot.explanations && rot.explanations.length > 0 && (
        <ul className="why glass">
          {rot.explanations.map((e, i) => <li key={e} style={{ animationDelay: `${i * 120}ms` }}>{e}</li>)}
        </ul>
      )}

      <h3 className="sub">🗓️ Season-by-season plan</h3>
      <ol className="timeline">
        {rot.seasons.map((s, i) => (
          <li key={s.index} style={{ "--c": FAMILY_COLORS[s.crop.family], animationDelay: `${i * 140}ms` } as React.CSSProperties}>
            <span className="tl-dot">{FAMILY_ICONS[s.crop.family]}</span>
            <div className="tl-card glass">
              <span className="when">{s.season === "warm" ? "☀️" : "❄️"} {s.label}</span>
              <strong>{s.crop.name}</strong>
              <span className="window">Sow → harvest: <b>{s.window}</b></span>
              <span className="muted small">{s.crop.note}</span>
              <Meter value={s.yield_factor} label="Yield" />
              <div className="tl-tags">
                <span>{s.irrigation_mm ? `💧 ${s.irrigation_mm} mm` : "🌧️ Rain-fed"}</span>
                {s.n_credit_kg > 0 && <span>🌿 +{s.n_credit_kg} kg N</span>}
              </div>
              {s.notes.length > 0 && <ul className="notes">{s.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
            </div>
          </li>
        ))}
      </ol>

      <div className="charts three">
        <div className="chart glass">
          <h3>📊 Balance of goals</h3>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData} outerRadius="72%">
              <PolarGrid stroke={pal.grid} />
              <PolarAngleAxis dataKey="metric" tick={{ fill: pal.muted, fontSize: 12 }} />
              <Radar name="Recommended" dataKey="Recommended" stroke={pal.primary} fill={pal.primary} fillOpacity={0.35} animationDuration={1200} />
              <Radar name="Today" dataKey="Today" stroke={pal.baseline} fill={pal.baseline} fillOpacity={0.2} animationDuration={1200} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => v.toFixed(0)} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart glass">
          <h3>🌱 Soil Health Index</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={soilData} margin={{ top: 10, right: 30, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={pal.grid} vertical={false} />
              <XAxis dataKey="step" tick={{ fill: pal.muted, fontSize: 11 }} minTickGap={8} axisLine={false} tickLine={false} />
              <YAxis domain={[(min: number) => Math.floor(min - 5), (max: number) => Math.ceil(max + 5)]} tick={{ fill: pal.muted, fontSize: 12 }}
                allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => v.toFixed(1)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line dataKey="Recommended" stroke={pal.primary} strokeWidth={3} dot={{ r: 4, fill: pal.primary }} animationDuration={1600} />
              <Line dataKey="Today" stroke={pal.baseline} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} animationDuration={1600} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="chart glass">
          <h3>💧 Irrigation per season</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={waterData} margin={{ top: 10, right: 6, left: -10, bottom: 0 }}>
              <CartesianGrid stroke={pal.grid} vertical={false} />
              <XAxis dataKey="season" tick={{ fill: pal.muted, fontSize: 11 }} minTickGap={8} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: pal.muted, fontSize: 12 }} unit=" mm" width={60} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => `${v} mm`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Recommended" fill={pal.rain} radius={[6, 6, 0, 0]} animationDuration={1200} />
              <Bar dataKey="Today" fill={pal.baseline} radius={[6, 6, 0, 0]} animationDuration={1200} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
