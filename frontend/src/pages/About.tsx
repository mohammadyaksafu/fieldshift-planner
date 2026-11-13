import { Link } from "react-router-dom";
import { useReveal } from "../hooks";

const PIPELINE = [
  { icon: "🛰️", title: "NASA POWER", text: "15 years of monthly temperature, rainfall (GPM IMERG-corrected), root-zone soil wetness and sunlight from MERRA-2." },
  { icon: "🌿", title: "MODIS NDVI", text: "Terra MOD13Q1 vegetation index at 250 m, every 16 days for the past year, shows the real cropping cycle." },
  { icon: "🧪", title: "SoilGrids", text: "Clay, sand, organic carbon, pH and nitrogen for the top 30 cm of soil." },
  { icon: "📚", title: "FAO knowledge", text: "ECOCROP temperature ranges, FAO-56 crop water needs and FAO-33 yield response to drought." },
];

const MODEL = [
  { t: "Find sowing windows", d: "Each crop slides through the warm and cool halves of the year to find the months with the best temperature and water fit." },
  { t: "Balance water", d: "Effective rain plus stored soil water (from NASA soil wetness) is compared with crop needs. Your irrigation covers part or all of the gap." },
  { t: "Estimate yield", d: "Any remaining water shortfall becomes yield loss using the FAO-33 response factor. Drought-tolerant crops lose less." },
  { t: "Simulate soil", d: "The Soil Health Index rises with legumes, cover crops and residue, and falls with bare fallow, heavy tillage and repeating crop families." },
  { t: "Rank rotations", d: "Thousands of sequences are scored on income, water saving, soil health and risk, weighted by your sliders." },
];

export default function About() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className="page about">
      <div className="page-head reveal">
        <span className="eyebrow">How it works</span>
        <h1>Transparent science, <span className="grad-text">from orbit to field</span></h1>
        <p className="lead muted">Every number in FieldShift comes from open data and a rule you can read. No black box.</p>
      </div>

      <section className="section">
        <h2 className="reveal">🔭 Data we use</h2>
        <div className="pipeline">
          {PIPELINE.map((p, i) => (
            <div key={p.title} className="glass pipe-card reveal" style={{ transitionDelay: `${i * 110}ms` }}>
              <span className="pipe-icon">{p.icon}</span>
              <h3>{p.title}</h3>
              <p className="muted">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="reveal">⚙️ The model, step by step</h2>
        <ol className="model-steps">
          {MODEL.map((m, i) => (
            <li key={m.t} className="reveal" style={{ transitionDelay: `${i * 90}ms` }}>
              <span className="ms-n">{i + 1}</span>
              <div>
                <h3>{m.t}</h3>
                <p className="muted">{m.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="section two-up">
        <div className="glass note reveal">
          <h3>⚠️ Honest limits</h3>
          <p className="muted">FieldShift compares strategies; it doesn't forecast exact yields. Crop values are global averages. Check local varieties, prices and markets with your extension officer.</p>
        </div>
        <div className="glass note reveal team">
          <h3>💫 Team of Dream</h3>
          <p className="muted">We built FieldShift Planner for the NASA International Space Apps Challenge 2026 to put NASA Earth data in the hands of every farmer.</p>
          <Link to="/plan" className="btn glow">Try it on your field →</Link>
        </div>
      </section>
    </div>
  );
}
