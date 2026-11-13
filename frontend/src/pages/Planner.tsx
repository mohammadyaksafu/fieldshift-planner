import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FarmForm from "../components/FarmForm";
import MapPicker from "../components/MapPicker";
import { MissionLoader } from "../components/Visuals";
import { usePlanner } from "../state";

const STEPS = ["Location", "Your farm", "Launch"];

export default function Planner() {
  const { crops, input, setInput, placeName, setPlaceName, analyze, loading, error } = usePlanner();
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  async function launch() {
    if (await analyze()) navigate("/results");
  }

  const cropName = (id: string) => crops.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="page planner">
      {loading && <MissionLoader />}
      <div className="page-head">
        <span className="eyebrow">Planner</span>
        <h1>Plan your <span className="grad-text">next seasons</span></h1>
      </div>

      <ol className="wizard" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className={i < step ? "done" : i === step ? "current" : ""}>
            <button type="button" onClick={() => i <= step && setStep(i)} disabled={i > step}>
              <span className="wiz-dot">{i < step ? "✓" : i + 1}</span>
              <span className="wiz-label">{s}</span>
            </button>
          </li>
        ))}
        <span className="wizard-bar" style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
      </ol>

      <div className="wizard-panel glass" key={step}>
        {step === 0 && (
          <>
            <div className="panel-head">
              <h2>📍 Where is your field?</h2>
              <p className="muted">Pick an example, search your village, or click directly on the satellite map.</p>
            </div>
            <MapPicker
              lat={input.lat}
              lon={input.lon}
              onPick={(lat, lon, name) => {
                setInput({ ...input, lat, lon });
                setPlaceName(name);
              }}
            />
          </>
        )}

        {step === 1 && (
          <>
            <div className="panel-head">
              <h2>🚜 Tell us about your farm</h2>
              <p className="muted">This shapes the comparison with what you do today and how options are ranked.</p>
            </div>
            <FarmForm crops={crops} input={input} onChange={setInput} />
          </>
        )}

        {step === 2 && (
          <div className="launch">
            <div className="launch-rocket" aria-hidden="true">🚀</div>
            <h2>Ready for launch</h2>
            <p className="muted">We'll pull NASA data for your field and simulate thousands of rotations.</p>
            <dl className="summary">
              <div><dt>Field</dt><dd>{placeName}<small>{input.lat.toFixed(3)}°, {input.lon.toFixed(3)}°</small></dd></div>
              <div><dt>Growing now</dt><dd>{cropName(input.current.warm)} / {cropName(input.current.cool)}</dd></div>
              <div><dt>Irrigation</dt><dd className="cap">{input.irrigation === "none" ? "Rain only" : input.irrigation}</dd></div>
              <div><dt>Plan length</dt><dd>{input.seasons / 2} year{input.seasons > 2 ? "s" : ""} · {input.seasons} seasons</dd></div>
            </dl>
            {error && <div className="error" role="alert">⚠️ {error}</div>}
            <button type="button" className="btn glow big launch-btn" onClick={launch} disabled={loading}>
              🛰️ Analyze my field
            </button>
          </div>
        )}
      </div>

      <div className="wizard-nav">
        <button type="button" className="btn ghost" onClick={() => setStep(step - 1)} disabled={step === 0}>← Back</button>
        {step < STEPS.length - 1 && (
          <button type="button" className="btn glow" onClick={() => setStep(step + 1)}>Continue →</button>
        )}
      </div>
    </div>
  );
}
