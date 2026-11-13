# FieldShift Planner 🌾🛰️

**NASA Space Apps Challenge 2026: _Field Shift: Adapting Farms with NASA Data_**

<p align="center">
  <a href="http://165.99.219.251:8099"><img alt="Live demo: open the app" src="https://img.shields.io/badge/%F0%9F%9A%80%20LIVE%20DEMO-Open%20FieldShift%20Planner-2ea44f?style=for-the-badge"></a>
  <a href="https://youtu.be/Dg5IeczcbRU"><img alt="Watch the demo video" src="https://img.shields.io/badge/%E2%96%B6%20DEMO%20VIDEO-Watch%20on%20YouTube-red?style=for-the-badge&logo=youtube&logoColor=white"></a>
</p>

> [!IMPORTANT]
> ### 🌐 The project is live: **[http://165.99.219.251:8099](http://165.99.219.251:8099)**
> Open the link, pick a field on the map (or try an example such as Mymensingh, Bangladesh) and get NASA-powered crop rotation recommendations in seconds. No sign-up or API key needed.
>
> | | Link |
> |---|---|
> | 🚀 **Live app** | **http://165.99.219.251:8099** |
> | 🩺 API health check | http://165.99.219.251:8099/api/health |
> | 🎬 Demo video | https://youtu.be/Dg5IeczcbRU |
> | 👥 Team | Team of Dream (Barisal, Bangladesh) |

FieldShift Planner is a decision-support web app. A farmer picks their field on a map, says what they grow now and what matters most to them (income, saving water, soil health, low risk), and gets the best **crop rotations for the next 1–3 years**. Each rotation is scored with real NASA Earth observations and explained in plain language.

The app has four pages with a dark "mission control" design and smooth animations:

| Page | What happens |
|---|---|
| **Home** `/` | Animated Earth with an orbiting satellite, problem statistics, how it works, features, a real result showcase |
| **Planner** `/plan` | 3-step wizard: 1) pick your field on a satellite map, search or examples, 2) farm details (current crops, irrigation tiles, priority sliders, plan length, optional soil test), 3) launch summary, then an animated "scanning from orbit" loader |
| **Results** `/results` | Score ring and headline gains, plus tabs for **Rotations** (top 5 options, impact counters, season timeline, radar, soil and irrigation charts, printable plan), **NASA insights** (climate, rain reliability, NDVI, soil) and **What grows here** (crop cards per season) |
| **How it works** `/about` | Data sources, the model step by step, limitations, Team of Dream |

---|---|
| 1. Pick your field | Click the satellite map, search a place, or use an example location |
| 2. Tell us about your farm | Current crops for each half of the year, irrigation level, priority sliders, optional soil test values |
| 3. What NASA sees | 15 years of climate, rainfall reliability, warming trend, a year of MODIS vegetation health, soil texture/pH/carbon, and a "what grows well here" table with the best sowing window for each crop |
| 4. Best rotations | Top 5 rotations compared with your current practice: score, irrigation saved, free nitrogen from legumes, Soil Health Index over time, a season-by-season plan and a printable version |

---

## Data sources

| Data | Source | Used for |
|---|---|---|
| Temperature (mean, daily max/min), rainfall, **root-zone soil wetness**, solar radiation, 15 years monthly | **NASA POWER** (MERRA-2 + GPM IMERG-corrected precipitation), `community=AG` | Season climate, sowing windows, water balance, warming/rain trends |
| NDVI vegetation index, last 12 months, 250 m | **NASA MODIS Terra MOD13Q1** via the ORNL DAAC MODIS web service | Showing the field's current cropping cycle and greenness |
| Clay/sand/silt, organic carbon, pH, nitrogen (0–30 cm) | **ISRIC SoilGrids 2.0** | Soil texture fit, pH fit, starting Soil Health Index, soil water storage |
| Crop temperature ranges, water needs, drought tolerance, yield response | **FAO ECOCROP**, **FAO-56**, **FAO-33** | The crop knowledge base (`backend/app/engine/crops.py`) |

None of these need an API key. Responses are cached on disk for 7 days (`backend/.cache`), so repeat demos are fast and still work if a service is slow.

---

## How the model works (fully transparent)

1. **Seasons.** The year is split into a warmer half and a cooler half (flipped in the Southern Hemisphere). If a winter has fewer than 3 months above 5 °C, it is marked *dormant*, and only autumn-sown hardy crops (winter wheat, winter rapeseed, rye + vetch) are allowed.
2. **Best sowing window.** Each crop is slid across its season (for example rice over Apr–Jul, May–Aug, Jun–Sep) and the window with the best expected yield is kept.
3. **Crop fit (0–1)** = temperature fit (FAO trapezoid) × heat stress (average daily max vs. crop limit) × soil pH fit × texture fit × waterlogging penalty.
4. **Water balance.** Effective rain (75 %) plus stored soil water (from NASA root-zone wetness) is compared with the crop's water need. The irrigation level decides how much of the shortfall is pumped. Any remaining shortfall becomes yield loss using the **FAO-33 yield response factor (Ky)**.
5. **Rotation simulation** over 2–6 seasons:
   - **Soil Health Index (0–100)** starts from soil organic carbon and pH. It gains points from legumes, cover crops and crop residue, and loses points for bare fallow, heavy tillage, high-nitrogen cereals and the same crop family twice in a row.
   - **Nitrogen credit**: a legume or cover crop passes fixed nitrogen to the next crop.
   - **Risk** uses low fit, water stress, the NASA warming trend (when the heat margin is small) and year-to-year rainfall variability, with a bonus for crop diversity.
6. **Score** = the four metrics (income, water saving, soil health, low risk) weighted by the farmer's sliders. Every possible rotation is evaluated (thousands per request), and the top 5 *meaningfully different* rotations are returned. A rotation that only reorders the same crops counts as the same option.

> ⚠️ The tool compares strategies; it doesn't forecast yields. Crop values are global averages, so check local varieties and prices with an extension officer.

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite 5, React Router 6 (multi-page), Leaflet / react-leaflet (Esri satellite + OSM), Recharts, CSS animations (scroll reveal, count-up, page transitions; respects reduced-motion) |
| Backend | Python 3.10+, FastAPI, httpx (async, parallel NASA calls), Pydantic v2 |
| Tests | pytest (engine + API, run offline with stubbed data) |
| Deploy | Docker + docker-compose (nginx serves the web app and proxies `/api`) |

```
fieldshift-planner/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI routes: /api/health, /api/crops, /api/profile, /api/recommend
│   │   ├── schemas.py         # request validation
│   │   ├── cache.py           # memory + disk cache
│   │   ├── services/          # NASA POWER, MODIS NDVI, SoilGrids, profile builder, planning calendar
│   │   └── engine/            # crops knowledge base, climate windows, scoring, rotation search
│   └── tests/
├── frontend/
│   └── src/
│       ├── App.tsx            # routes + animated space background
│       ├── pages/             # Home, Planner, Results, About
│       ├── components/        # Navbar/Footer, Visuals (Earth, ScoreRing, loader), MapPicker, FarmForm, ProfilePanel, Recommendations
│       ├── state.tsx, hooks.ts, api.ts, types.ts, theme.ts, styles.css
└── docker-compose.yml
```

---

## Run it locally (Windows / macOS / Linux)

**Requirements:** Python 3.10+ and Node.js 18+.

### 1. Backend (terminal 1)

```bash
cd backend
python -m venv .venv
# Windows (PowerShell):  .venv\Scripts\Activate.ps1
# macOS/Linux:           source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Interactive API docs: <http://localhost:8000/docs>

### 2. Frontend (terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. Vite forwards `/api` to the backend.

### 3. Tests

```bash
cd backend
python -m pytest -q
```

### Or with Docker

```bash
docker compose up --build
```

Then open <http://localhost:8080>.

---

## API

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Liveness check |
| GET | `/api/crops` | Crop knowledge base |
| GET | `/api/profile?lat=&lon=&irrigation=` | Climate normals and trends, seasons, soil, NDVI, crop suitability matrix, data sources |
| POST | `/api/recommend` | Ranked rotations compared with current practice |

Example:

```bash
curl -X POST http://localhost:8000/api/recommend -H "Content-Type: application/json" -d '{
  "lat": 24.75, "lon": 90.4,
  "current": {"warm": "rice", "cool": "rice"},
  "irrigation": "full",
  "seasons": 4,
  "priorities": {"profit": 3, "water": 3, "soil": 3, "resilience": 3},
  "soil_override": {"phh2o": 5.8}
}'
```

---

## Demo script (for the 30-second video)

1. Open **Mymensingh, Bangladesh**, with rice in both seasons and full irrigation, then click **Find my best rotations**.
2. Show the NASA panel: monsoon rainfall bars, the NDVI cycle and the "what grows here" table.
3. Option #1, **Lentil → Rice → Cover crop → Rice**: saves about 1,500 mm of pumped water, adds about 90 kg N/ha of free nitrogen and raises the Soil Health Index by about 19 points compared with rice monoculture.
4. Switch to **Punjab, India** (rice–wheat, the world's most water-stressed rotation) and show the irrigation savings.
5. Move the **Income** slider to the top and show how the ranking changes. The farmer stays in control.

## Roadmap

- SMAP L4 soil moisture and ECOSTRESS evapotranspiration via NASA Earthdata login
- Local-language UI (Bangla, Hindi, Swahili, Spanish) and voice read-out
- Local crop prices and varieties (FAOSTAT / national extension data)
- SMS / offline summary for low-bandwidth areas
- Validation against county/district yield statistics
