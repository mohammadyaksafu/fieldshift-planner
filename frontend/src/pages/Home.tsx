import { Link } from "react-router-dom";
import { useReveal } from "../hooks";
import { Counter, EarthHero } from "../components/Visuals";

const STEPS = [
  { n: "01", icon: "📍", title: "Pin your field", text: "Click your farm on a satellite map or search your village. Anywhere on Earth works." },
  { n: "02", icon: "🛰️", title: "We read it from orbit", text: "15 years of NASA climate, a year of MODIS vegetation health, and global soil maps, in seconds." },
  { n: "03", icon: "🔁", title: "Get your best rotations", text: "Thousands of crop sequences are simulated and ranked by what you care about most." },
];

const FEATURES = [
  { icon: "💧", title: "Save water", text: "See exactly how many millimetres of pumping each rotation needs compared with today." },
  { icon: "🌱", title: "Rebuild soil", text: "A Soil Health Index that rises with legumes and cover crops and falls with monoculture." },
  { icon: "🧪", title: "Free nitrogen", text: "Legumes fix nitrogen for the next crop. We count it, so you can cut fertilizer." },
  { icon: "🔥", title: "Climate-ready", text: "Warming trends and rainfall reliability from NASA flag crops that are becoming risky." },
  { icon: "📅", title: "Sowing windows", text: "Each crop is placed in its best months, for example rice Jun–Sep, not just 'summer'." },
  { icon: "🖨️", title: "Printable plan", text: "A clear season-by-season plan to share with family or an extension officer." },
];

const SOURCES = ["NASA POWER", "MERRA-2", "GPM IMERG", "MODIS Terra NDVI", "ORNL DAAC", "ISRIC SoilGrids", "FAO ECOCROP", "FAO-56", "FAO-33"];

export default function Home() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className="page home">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow reveal">NASA Space Apps 2026 · Field Shift · Team of Dream</span>
          <h1 className="reveal">
            Grow smarter with <span className="grad-text">data from space</span>.
          </h1>
          <p className="lead reveal">
            FieldShift Planner turns NASA Earth observations into crop rotations that <b>protect your soil</b>, <b>save water</b> and{" "}
            <b>adapt to a changing climate</b>. Free, for any field on the planet.
          </p>
          <div className="hero-cta reveal">
            <Link to="/plan" className="btn glow big">Plan my field →</Link>
            <Link to="/about" className="btn ghost big">How it works</Link>
          </div>
          <div className="hero-stats reveal">
            <div><strong><Counter to={15} suffix=" yrs" /></strong><span>of NASA climate data</span></div>
            <div><strong><Counter to={10000} suffix="+" /></strong><span>rotations compared per field</span></div>
            <div><strong><Counter to={16} /></strong><span>crops & cover crops</span></div>
          </div>
        </div>
        <EarthHero />
      </section>

      <div className="marquee" aria-label="Data sources">
        <div className="marquee-track">
          {[...SOURCES, ...SOURCES].map((s, i) => <span key={i}>✦ {s}</span>)}
        </div>
      </div>

      <section className="section">
        <div className="section-head reveal">
          <span className="eyebrow">The problem</span>
          <h2>Farming is getting harder to predict</h2>
          <p className="muted">Shifting rain, more heat and tired soil make the old crop calendar risky. Farmers need local, data-driven advice, not guesses.</p>
        </div>
        <div className="problem-grid">
          {[
            { big: 40, suf: "%", t: "of the world's land is degraded (UNCCD)", ic: "🏜️" },
            { big: 70, suf: "%", t: "of freshwater withdrawals go to agriculture (FAO)", ic: "💧" },
            { big: 500, suf: "M", t: "smallholder farms feed much of the world (IFAD)", ic: "🚜" },
          ].map((p, i) => (
            <div key={p.t} className="glass problem-card reveal" style={{ transitionDelay: `${i * 120}ms` }}>
              <span className="problem-icon">{p.ic}</span>
              <strong className="grad-text"><Counter to={p.big} suffix={p.suf} /></strong>
              <p>{p.t}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head reveal">
          <span className="eyebrow">How it works</span>
          <h2>From orbit to your field in three steps</h2>
        </div>
        <div className="steps">
          {STEPS.map((s, i) => (
            <div key={s.n} className="glass step-card reveal" style={{ transitionDelay: `${i * 150}ms` }}>
              <span className="step-n">{s.n}</span>
              <span className="step-icon">{s.icon}</span>
              <h3>{s.title}</h3>
              <p className="muted">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head reveal">
          <span className="eyebrow">What you get</span>
          <h2>Everything a farmer needs to decide</h2>
        </div>
        <div className="features">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="feature reveal" style={{ transitionDelay: `${(i % 3) * 100}ms` }}>
              <span className="feature-icon">{f.icon}</span>
              <div>
                <h3>{f.title}</h3>
                <p className="muted">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="showcase glass reveal">
          <div>
            <span className="eyebrow">Real result · Mymensingh, Bangladesh</span>
            <h2>Rice → Rice becomes <span className="grad-text">Lentil → Rice → Cover crop → Rice</span></h2>
            <p className="muted">Same rice harvest each monsoon. A low-water pulse and a green manure in the dry season.</p>
          </div>
          <div className="showcase-stats">
            <div><strong><Counter to={1523} prefix="−" suffix=" mm" /></strong><span>irrigation water</span></div>
            <div><strong><Counter to={93} prefix="+" suffix=" kg" /></strong><span>free nitrogen / ha</span></div>
            <div><strong><Counter to={19} prefix="+" /></strong><span>soil health points</span></div>
          </div>
        </div>
      </section>

      <section className="section cta-band reveal">
        <h2>Ready to see what NASA sees on your farm?</h2>
        <Link to="/plan" className="btn glow big">Start planning, it's free →</Link>
      </section>
    </div>
  );
}
