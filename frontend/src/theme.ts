// The app uses a single "mission control" dark theme. Recharts draws SVG attributes,
// so chart colors live here in JS rather than in CSS variables.
export const palette = {
  text: "#e8f0ea",
  muted: "#93a7a0",
  grid: "rgba(255,255,255,0.08)",
  rain: "#5fb4ff",
  temp: "#ffb347",
  heat: "#ff6b6b",
  ndvi: "#7ee08f",
  primary: "#7ee08f",
  baseline: "#6b7d86",
  tooltipBg: "#0f1d2b",
};

export type Palette = typeof palette;

export const usePalette = (): Palette => palette;

export const tooltipStyle = {
  contentStyle: {
    background: palette.tooltipBg,
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    color: palette.text,
    boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
  },
  labelStyle: { color: palette.muted },
};

export const FAMILY_COLORS: Record<string, string> = {
  cereal: "#ffc857",
  legume: "#7ee08f",
  brassica: "#f3e37c",
  solanaceae: "#d89a74",
  fiber: "#c3a6ff",
  cover: "#5ee0d0",
  fallow: "#8a9ba3",
};

export const FAMILY_ICONS: Record<string, string> = {
  cereal: "🌾",
  legume: "🌿",
  brassica: "🌼",
  solanaceae: "🥔",
  fiber: "☁️",
  cover: "🍀",
  fallow: "🟫",
};
