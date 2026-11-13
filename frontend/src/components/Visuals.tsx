import { useEffect, useState } from "react";
import { useCountUp, useInView } from "../hooks";

/** Animated Earth with an orbiting satellite scanning a patchwork of fields. */
export function EarthHero() {
  return (
    <div className="earth-hero" aria-hidden="true">
      <div className="earth-glow" />
      <svg viewBox="0 0 500 500" className="earth-svg">
        <defs>
          <radialGradient id="ocean" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#3a8fd0" />
            <stop offset="55%" stopColor="#1b4f86" />
            <stop offset="100%" stopColor="#0b2343" />
          </radialGradient>
          <radialGradient id="shade" cx="30%" cy="25%" r="80%">
            <stop offset="55%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
          </radialGradient>
          <clipPath id="globe"><circle cx="250" cy="250" r="160" /></clipPath>
          <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffe08a" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ffe08a" stopOpacity="0" />
          </linearGradient>
        </defs>

        <circle cx="250" cy="250" r="160" fill="url(#ocean)" />
        <g clipPath="url(#globe)">
          <g className="land-drift">
            {/* Stylised continents made of farm-field patches */}
            {[0, 1].map((k) => (
              <g key={k} transform={`translate(${k * 420} 0)`}>
                <path d="M120 170c30-30 90-40 120-20s20 60-10 80-70 30-90 10-40-40-20-70z" fill="#4f9d5d" />
                <path d="M250 250c40-20 100-10 110 30s-30 90-70 80-60-30-60-60 0-40 20-50z" fill="#6bb36f" />
                <path d="M80 280c20-10 60 0 70 30s-10 60-40 60-50-30-50-50 5-30 20-40z" fill="#3f8f4f" />
                <path d="M300 140c20-10 50-5 60 15s-10 35-30 35-40-10-40-25 0-20 10-25z" fill="#d9a441" />
                <g stroke="#2f6b3f" strokeOpacity="0.45" strokeWidth="1.2">
                  <path d="M130 185h90M125 200h110M140 215h80" />
                  <path d="M265 270h80M260 290h95M275 310h60" />
                </g>
              </g>
            ))}
          </g>
          <ellipse cx="250" cy="250" rx="160" ry="40" fill="none" stroke="#ffffff" strokeOpacity="0.07" />
          <ellipse cx="250" cy="250" rx="160" ry="100" fill="none" stroke="#ffffff" strokeOpacity="0.06" />
          <ellipse cx="250" cy="250" rx="60" ry="160" fill="none" stroke="#ffffff" strokeOpacity="0.06" />
        </g>
        <circle cx="250" cy="250" r="160" fill="url(#shade)" />
        <circle cx="250" cy="250" r="162" fill="none" stroke="#7fd3ff" strokeOpacity="0.35" strokeWidth="3" />

        <g className="orbit">
          <ellipse cx="250" cy="250" rx="225" ry="225" fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeDasharray="3 9" />
          <g className="satellite" transform="translate(250 25)">
            <path d="M0 0 L-26 150 L26 150 Z" fill="url(#beam)" opacity="0.35" className="scan-beam" />
            <rect x="-9" y="-7" width="18" height="14" rx="3" fill="#e9eef2" />
            <rect x="-40" y="-5" width="26" height="10" fill="#3a6fb0" stroke="#9cc6ef" strokeWidth="1" />
            <rect x="14" y="-5" width="26" height="10" fill="#3a6fb0" stroke="#9cc6ef" strokeWidth="1" />
            <circle cx="0" cy="9" r="3" fill="#ffd36b" />
          </g>
        </g>
      </svg>
      <div className="float-chip c1">🌧️ Rainfall · GPM</div>
      <div className="float-chip c2">🌡️ Heat · MERRA-2</div>
      <div className="float-chip c3">🌿 NDVI · MODIS</div>
    </div>
  );
}

/** Circular score gauge that fills when scrolled into view. */
export function ScoreRing({ value, size = 150, label = "score" }: { value: number; size?: number; label?: string }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const shown = useCountUp(Math.round(value), seen, 1300);
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  return (
    <div ref={ref} className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7ee08f" />
            <stop offset="100%" stopColor="#ffd36b" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="ring-fill"
          stroke="url(#ringGrad)"
          strokeDasharray={c}
          strokeDashoffset={seen ? c * (1 - value / 100) : c}
        />
      </svg>
      <div className="ring-text">
        <strong>{shown}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

/** A number that counts up when visible. */
export function Counter({ to, suffix = "", prefix = "", decimals = 0 }: { to: number; suffix?: string; prefix?: string; decimals?: number }) {
  const [ref, seen] = useInView<HTMLSpanElement>();
  const v = useCountUp(to, seen, 1500, decimals);
  return <span ref={ref}>{prefix}{v.toLocaleString(undefined, { maximumFractionDigits: decimals })}{suffix}</span>;
}

const STAGES = [
  { icon: "🛰️", text: "Contacting NASA POWER for 15 years of climate…" },
  { icon: "🌧️", text: "Reading GPM rainfall and root-zone soil wetness…" },
  { icon: "🌿", text: "Fetching a year of MODIS vegetation health…" },
  { icon: "🧪", text: "Querying SoilGrids for texture, pH and carbon…" },
  { icon: "🔁", text: "Simulating thousands of crop rotations…" },
];

/** Full-screen overlay shown while the analysis runs. */
export function MissionLoader() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 2200);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="mission-loader" role="status" aria-live="polite">
      <div className="loader-orbit">
        <div className="loader-planet" />
        <div className="loader-ring"><span className="loader-sat">🛰️</span></div>
        <div className="loader-ring r2"><span className="loader-sat">✦</span></div>
      </div>
      <h2>Scanning your field from orbit</h2>
      <ol className="loader-steps">
        {STAGES.map((s, i) => (
          <li key={s.text} className={i < stage ? "done" : i === stage ? "active" : ""}>
            <span>{i < stage ? "✓" : s.icon}</span>
            {s.text}
          </li>
        ))}
      </ol>
    </div>
  );
}
