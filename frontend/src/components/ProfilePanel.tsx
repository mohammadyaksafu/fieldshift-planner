import { useState } from "react";
import {
  Area, AreaChart, Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { FAMILY_COLORS, FAMILY_ICONS, palette as pal, tooltipStyle } from "../theme";
import type { Profile, SeasonName } from "../types";
import { Counter } from "./Visuals";

const TEXTURE_LABEL = { sandy: "Sandy", loam: "Loam", clay: "Clay" };

function Stat({ icon, label, value, hint, tone, delay }: {
  icon: string; label: string; value: React.ReactNode; hint?: string; tone?: "good" | "warn" | "bad"; delay: number;
}) {
  return (
    <div className={`stat glass reveal ${tone ?? ""}`} style={{ transitionDelay: `${delay}ms` }} title={hint}>
      <span className="stat-icon">{icon}</span>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}

const sign = (v: number) => (v > 0 ? `+${v}` : `${v}`);

export function Insights({ profile }: { profile: Profile }) {
  const { trends } = profile.climate;
  const soil = profile.soil;
  const climateData = profile.climate.normals.map((n) => ({ month: n.label, rain: n.PRECTOTCORR, temp: n.T2M, tmax: n.T2M_DAYMAX }));
  const reliability = trends.rain_variability_cv > 0.25 ? "Unreliable" : trends.rain_variability_cv > 0.15 ? "Variable" : "Steady";

  return (
    <div className="insights">
      <div className="stats">
        <Stat delay={0} icon="🌧️" label="Yearly rainfall" value={<><Counter to={trends.annual_rain_mm ?? 0} /> mm</>}
          hint={`${sign(trends.rain_change_pct_per_decade)}% per decade`} />
        <Stat delay={80} icon="🌡️" label="Avg temperature" value={<><Counter to={trends.annual_temp_c ?? 0} decimals={1} /> °C</>}
          hint={`${sign(trends.warming_c_per_decade)} °C per decade`} tone={trends.warming_c_per_decade > 0.3 ? "warn" : undefined} />
        <Stat delay={160} icon="📉" label="Rain reliability" value={reliability}
          hint={`Varies ${(trends.rain_variability_cv * 100).toFixed(0)}% year to year`}
          tone={reliability === "Unreliable" ? "bad" : reliability === "Variable" ? "warn" : "good"} />
        <Stat delay={240} icon="🔥" label="Very hot months" value={<Counter to={trends.hot_months} />} hint="Avg daily max ≥ 35 °C"
          tone={trends.hot_months >= 3 ? "warn" : "good"} />
        <Stat delay={320} icon="🪨" label="Soil" value={TEXTURE_LABEL[soil.texture]}
          hint={`pH ${soil.phh2o} · C ${soil.soc} g/kg${soil.estimated ? " · estimated" : ""}`} tone={soil.estimated ? "warn" : undefined} />
        <Stat delay={400} icon="🌱" label="Soil health" value={<><Counter to={profile.soil_health_index} decimals={1} /><small>/100</small></>}
          hint="Starting index from carbon & pH" tone={profile.soil_health_index >= 60 ? "good" : profile.soil_health_index < 45 ? "bad" : "warn"} />
      </div>

      <div className="charts">
        <div className="chart glass reveal">
          <h3>🌦️ Rainfall & temperature by month</h3>
          <p className="muted small">NASA POWER normals, {trends.years}</p>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={climateData} margin={{ top: 10, right: 6, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={pal.rain} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={pal.rain} stopOpacity={0.35} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={pal.grid} vertical={false} />
              <XAxis dataKey="month" tick={{ fill: pal.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="r" tick={{ fill: pal.muted, fontSize: 12 }} unit=" mm" width={62} axisLine={false} tickLine={false} />
              <YAxis yAxisId="t" orientation="right" tick={{ fill: pal.muted, fontSize: 12 }} unit="°" width={36} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} formatter={(v: number, n: string) => [n === "Rain" ? `${v.toFixed(0)} mm` : `${v.toFixed(1)} °C`, n]} />
              <Legend wrapperStyle={{ fontSize: 12, color: pal.muted }} />
              <Bar yAxisId="r" dataKey="rain" name="Rain" fill="url(#rainGrad)" radius={[6, 6, 0, 0]} animationDuration={1200} />
              <Line yAxisId="t" dataKey="temp" name="Avg temp" stroke={pal.temp} strokeWidth={2.5} dot={false} animationDuration={1600} />
              <Line yAxisId="t" dataKey="tmax" name="Avg daily max" stroke={pal.heat} strokeWidth={2} strokeDasharray="5 4" dot={false} animationDuration={1600} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="chart glass reveal">
          <h3>🌿 Vegetation health (NDVI)</h3>
          <p className="muted small">MODIS Terra · 250 m · last 12 months</p>
          {profile.ndvi.available ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={profile.ndvi.series} margin={{ top: 10, right: 6, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="ndviFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={pal.ndvi} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={pal.ndvi} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={pal.grid} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: pal.muted, fontSize: 12 }} axisLine={false} tickLine={false}
                  tickFormatter={(d: string) => new Date(d).toLocaleString("en", { month: "short" })} minTickGap={24} />
                <YAxis domain={[0, 1]} tick={{ fill: pal.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [v.toFixed(2), "NDVI"]} />
                <Area dataKey="ndvi" stroke={pal.ndvi} strokeWidth={2.5} fill="url(#ndviFill)" animationDuration={1800} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty">MODIS NDVI isn't available for this point right now.</p>
          )}
          <p className="muted small">Peaks show when crops are greenest; dips mean harvest, bare soil or stress.</p>
        </div>
      </div>
    </div>
  );
}

export function CropMatrix({ profile }: { profile: Profile }) {
  const [tab, setTab] = useState<SeasonName>("warm");
  const season = profile.seasons[tab];
  return (
    <div className="matrix glass">
      <div className="matrix-head">
        <div>
          <h3>🌾 What grows well here?</h3>
          <p className="muted small">
            {season.dormant
              ? `Winter is too cold for most crops (coldest month ${season.t_coldest} °C). Only autumn-sown hardy crops survive.`
              : `Avg ${season.t_mean.toFixed(1)} °C · daily max ${season.t_max.toFixed(1)} °C · rain ${season.rain_mm.toFixed(0)} mm`}
          </p>
        </div>
        <div className="segmented small">
          {(["warm", "cool"] as SeasonName[]).map((s) => (
            <button key={s} type="button" className={tab === s ? "on" : ""} onClick={() => setTab(s)}>
              {s === "warm" ? "☀️ Warm" : "❄️ Cool"} · {profile.seasons[s].label}
            </button>
          ))}
        </div>
      </div>
      <div className="crop-grid" key={tab}>
        {profile.crop_matrix[tab].map((r, i) => (
          <div key={r.crop} className="crop-card" style={{ animationDelay: `${i * 35}ms`, borderColor: `${FAMILY_COLORS[r.family]}55` }}>
            <div className="crop-top">
              <span className="crop-emoji" style={{ background: `${FAMILY_COLORS[r.family]}22` }}>{FAMILY_ICONS[r.family]}</span>
              <div>
                <b>{r.name}</b>
                <small className="muted">{r.window}{r.irrigation_mm ? ` · ${r.irrigation_mm} mm irrigation` : " · rain-fed"}</small>
              </div>
            </div>
            <Meter value={r.yield_factor} label="Expected yield" />
            {r.limits.length > 0 && <p className="crop-limit">⚠️ {r.limits[0]}</p>}
          </div>
        ))}
      </div>
      <p className="muted small">Expected yield is relative to the crop's potential with your irrigation level.</p>
    </div>
  );
}

export function Meter({ value, label }: { value: number; label?: string }) {
  const pct = Math.round(value * 100);
  const tone = pct >= 75 ? "good" : pct >= 45 ? "warn" : "bad";
  return (
    <div className={`meter ${tone}`} aria-label={`${label ?? ""} ${pct}%`}>
      {label && <span className="meter-label">{label}</span>}
      <span className="meter-track"><span style={{ width: `${pct}%` }} /></span>
      <em>{pct}%</em>
    </div>
  );
}
