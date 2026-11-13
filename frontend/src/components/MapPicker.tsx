import { useEffect, useState } from "react";
import { CircleMarker, LayersControl, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { geocode, type GeocodeHit } from "../api";

interface Props {
  lat: number;
  lon: number;
  onPick: (lat: number, lon: number, name: string) => void;
}

export const PRESETS = [
  { name: "Mymensingh, Bangladesh", lat: 24.75, lon: 90.4 },
  { name: "Punjab, India", lat: 30.9, lon: 75.8 },
  { name: "Iowa, USA", lat: 41.9, lon: -93.6 },
  { name: "Nakuru, Kenya", lat: -0.3, lon: 36.1 },
  { name: "Niamey, Niger", lat: 13.5, lon: 2.1 },
  { name: "Nile Delta, Egypt", lat: 30.8, lon: 31.0 },
];

const round = (v: number) => Math.round(v * 1e4) / 1e4;

function ClickHandler({ onPick }: { onPick: Props["onPick"] }) {
  useMapEvents({
    click: (e) => onPick(round(e.latlng.lat), round(e.latlng.lng), `Field at ${e.latlng.lat.toFixed(2)}°, ${e.latlng.lng.toFixed(2)}°`),
  });
  return null;
}

function FlyTo({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map.getBounds().pad(-0.2).contains([lat, lon])) map.flyTo([lat, lon], Math.max(map.getZoom(), 8), { duration: 1.4 });
  }, [lat, lon, map]);
  return null;
}

export default function MapPicker({ lat, lon, onPick }: Props) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<GeocodeHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setSearching(true);
    setSearchError("");
    try {
      const res = await geocode(q.trim());
      setHits(res);
      if (!res.length) setSearchError("No places found");
    } catch (err) {
      setSearchError((err as Error).message);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="map-picker">
      <form className="search" onSubmit={search}>
        <span className="search-icon">🔎</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a village, town or region…" aria-label="Search place" />
        <button type="submit" className="btn glow small" disabled={searching}>{searching ? "Searching…" : "Search"}</button>
      </form>
      {(hits.length > 0 || searchError) && (
        <ul className="hits">
          {searchError && <li className="muted">{searchError}</li>}
          {hits.map((h) => (
            <li key={`${h.lat},${h.lon}`}>
              <button
                type="button"
                onClick={() => {
                  onPick(round(+h.lat), round(+h.lon), h.display_name.split(",").slice(0, 2).join(","));
                  setHits([]);
                }}
              >
                📍 {h.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="presets">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            className={`chip ${p.lat === lat && p.lon === lon ? "active" : ""}`}
            onClick={() => onPick(p.lat, p.lon, p.name)}
          >
            📍 {p.name}
          </button>
        ))}
      </div>

      <div className="map-wrap">
        <MapContainer center={[lat, lon]} zoom={6} scrollWheelZoom={false} className="map">
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Satellite">
              <TileLayer
                attribution="Imagery &copy; Esri, Maxar, Earthstar Geographics"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={18}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Streets">
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            </LayersControl.BaseLayer>
          </LayersControl>
          <CircleMarker center={[lat, lon]} radius={22} pathOptions={{ color: "#ffd36b", weight: 2, fillOpacity: 0.12, className: "pin-pulse" }} />
          <CircleMarker center={[lat, lon]} radius={9} pathOptions={{ color: "#fff", weight: 3, fillColor: "#ffb347", fillOpacity: 1 }} />
          <ClickHandler onPick={onPick} />
          <FlyTo lat={lat} lon={lon} />
        </MapContainer>
        <div className="map-hint">Click anywhere to drop your field pin</div>
      </div>
      <p className="coords">📍 <strong>{lat.toFixed(4)}°, {lon.toFixed(4)}°</strong></p>
    </div>
  );
}
