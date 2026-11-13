import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { CropMatrix, Insights } from "../components/ProfilePanel";
import { CropChips, OptionPicker, RotationDetail } from "../components/Recommendations";
import { Counter, ScoreRing } from "../components/Visuals";
import { useReveal } from "../hooks";
import { usePlanner } from "../state";

type Tab = "rotations" | "insights" | "crops";

const TABS: { id: Tab; label: string }[] = [
  { id: "rotations", label: "🔁 Rotations" },
  { id: "insights", label: "🛰️ NASA insights" },
  { id: "crops", label: "🌾 What grows here" },
];

export default function Results() {
  const { result, profile, placeName } = usePlanner();
  const [tab, setTab] = useState<Tab>("rotations");
  const [selected, setSelected] = useState(0);
  const ref = useReveal<HTMLDivElement>();

  if (!result || !profile) return <Navigate to="/plan" replace />;
  const best = result.recommendations[0];
  const rot = result.recommendations[selected] ?? best;
  const saved = result.baseline.stats.irrigation_mm_total - (best?.stats.irrigation_mm_total ?? 0);

  return (
    <div ref={ref} className="page results">
      <section className="result-hero glass">
        <div className="rh-left">
          <span className="eyebrow">📍 {placeName} · {profile.location.lat.toFixed(2)}°, {profile.location.lon.toFixed(2)}°</span>
          <h1>Your field could do <span className="grad-text">much better</span>.</h1>
          {best && (
            <>
              <p className="lead">Best rotation for the next {result.plan.length} seasons:</p>
              <CropChips rotation={best} />
              <div className="rh-stats">
                <div><strong><Counter to={best.vs_baseline ?? 0} prefix="+" /></strong><span>points vs. today</span></div>
                {saved > 0 && <div><strong><Counter to={saved} suffix=" mm" /></strong><span>water saved</span></div>}
                <div><strong><Counter to={best.stats.n_saved_kg} suffix=" kg" /></strong><span>free nitrogen / ha</span></div>
                <div><strong><Counter to={result.evaluated} /></strong><span>rotations simulated</span></div>
              </div>
            </>
          )}
        </div>
        <div className="rh-right">
          <ScoreRing value={best?.score ?? 0} size={190} label="best score" />
          <div className="vs">
            <span>Today</span>
            <b>{result.baseline.score.toFixed(0)}</b>
          </div>
          <Link to="/plan" className="btn ghost small">✏️ Change inputs</Link>
        </div>
      </section>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="tab-panel" key={tab}>
        {tab === "rotations" && (
          <>
            <OptionPicker data={result} selected={selected} onSelect={setSelected} />
            {rot && <RotationDetail data={result} rot={rot} index={selected} />}
          </>
        )}
        {tab === "insights" && <Insights profile={profile} />}
        {tab === "crops" && <CropMatrix profile={profile} />}
      </div>
    </div>
  );
}
