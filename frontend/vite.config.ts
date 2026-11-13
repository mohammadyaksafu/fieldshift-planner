import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// In dev, /api is proxied to the FastAPI backend so the browser talks to one origin.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: { "/api": { target: env.VITE_API_PROXY || "http://127.0.0.1:8000", changeOrigin: true } },
    },
    build: {
      rollupOptions: { output: { manualChunks: { charts: ["recharts"], map: ["leaflet", "react-leaflet"] } } },
    },
  };
});
