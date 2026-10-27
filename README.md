# Elexon Wind Forecast Intelligence

Day-ahead wind briefing for a UK utility procurement desk. It scores the national wind forecast a buyer would have had at **D-1 10:00 UTC** against what Great Britain wind actually generated in **January 2026**.

The question it answers is operational: how far was the forecast from outturn, in which direction, and does a later forecast run materially reduce that error before the buying decision.

| | |
|---|---|
| Live application | https://abcdefgh-hqd.vercel.app/ |
| API | https://elexon-wind-api.onrender.com |
| Health | https://elexon-wind-api.onrender.com/health |
| Source | https://github.com/ishit08/abcdefgh |

The default view uses a committed January 2026 extract from the public [Elexon BMRS API](https://data.elexon.co.uk/bmrs/api/v1), so the dashboard loads without calling Elexon. **Refresh from Elexon** on the live app pulls the same month again.

## What the desk sees

- **Briefing.** Headline error for the month, plus forecast versus outturn for 12–18 January, when a Monday morning run sat more than 6 GW above outturn.
- **Lead time.** Mean absolute error by how far ahead the forecast was published (0–6h through 48–72h).
- **Daily risk.** A heat strip of daily mean absolute error across 1–31 January.
- **Desk metrics.** Mean absolute error, bias, P90 absolute error, and the share of hours inside ±1 GW.
- **Method.** The scoring rule is shown on the page, next to the numbers.

Positive bias means the forecast was above outturn. That is the volume the desk would have over-bought if it trusted the D-1 run.

## How a forecast is scored

Two Elexon datasets, joined on the delivery hour:

| Dataset | Role |
|---|---|
| `FUELHH`, `fuelType=WIND` | Half-hourly national wind actuals, averaged to the delivery hour |
| `WINDFOR` | Wind generation forecasts. For each delivery hour, the latest run published at or before **D-1 10:00 UTC** |

Forecasts published from 30 December 2025 are included so 1 January has a full day-ahead window. Delivery hours run from 1 January 2026 00:00 UTC through 31 January 2026 23:00 UTC.

Error is `forecast − actual`, in MW. From that series the API reports:

| Metric | Definition |
|---|---|
| MAE | Mean absolute error |
| RMSE | Root mean square error |
| sMAPE | Symmetric mean absolute percentage error |
| Bias | Mean signed error. Positive means over-forecast |
| P90 | 90th percentile of absolute error |
| Within 1 GW | Share of hours with absolute error below 1,000 MW |
| ±3 GW hours | Hours with signed error beyond +3 GW or below −3 GW |
| Horizon MAE | Absolute error by lead-time bucket |

If the Elexon call fails, the API falls back to a labelled synthetic series and sets `metadata.dataMode` to `sample`. The bundled path sets it to `seed`. A live refresh sets it to `live`.

## Architecture

```text
React (Vite)  →  FastAPI  →  Elexon BMRS
     │              │
     │              ├─ seed/     committed January 2026 extract and precomputed dashboard
     │              └─ cache/    responses from a live refresh
     └─ Vercel            Render
```

The default `GET /api/dashboard` returns the precomputed seed (`backend/data/seed/dashboard_january_2026.json`). `?live=true` bypasses that file, reads FUELHH and WINDFOR (seed files first, then the Elexon API when `prefer_seed` is off), and rebuilds the metrics. Live responses are cached on disk under `backend/data/cache/`.

CORS allows the local Vite ports and any `*.vercel.app` origin. Set `FRONTEND_ORIGIN` when the frontend hostname is different.

## Repository

```text
backend/
  app/                 FastAPI app, Elexon client, analytics
  data/seed/           January 2026 FUELHH, WINDFOR, and precomputed dashboard
  tests/               Analytics tests
  Dockerfile
frontend/
  src/                 React dashboard
  Dockerfile
scripts/
  prefetch_january_2026.py
docker-compose.yml
render.yaml
```

## Run locally

Requires Python 3.12 and Node.js.

**API**

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Dashboard** (second terminal)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The API is at http://localhost:8000.

`pytest` is installed inside the virtual environment, not as a global command:

```bash
cd backend
source .venv/bin/activate
pytest
```

## Run with Docker

```bash
docker compose up --build
```

- Dashboard: http://localhost:5173
- API: http://localhost:8000

The Compose frontend is built with `VITE_API_BASE_URL=http://localhost:8000`.

## Configuration

Backend (`backend/.env.example`):

| Variable | Purpose | Default |
|---|---|---|
| `ELEXON_BASE_URL` | BMRS API root | `https://data.elexon.co.uk/bmrs/api/v1` |
| `FRONTEND_ORIGIN` | Extra CORS origin (comma-separated) | `http://localhost:5173` |
| `CACHE_DIR` | Live-response cache | `backend/data/cache` |
| `USE_ELEXON_DATA` | Use Elexon rows when rebuilding | `true` |
| `SEED_DIR` | Bundled January extract | `backend/data/seed` |

Frontend (`frontend/.env.example`):

| Variable | Purpose | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Backend origin | `http://localhost:8000` |

Production uses the same variables: `FRONTEND_ORIGIN` on the API, `VITE_API_BASE_URL` on the frontend build.

## API

| Endpoint | Returns |
|---|---|
| `GET /health` | `{ "status": "ok" }` |
| `GET /api/dashboard` | Full payload: metadata, cards, summary, timeseries, daily accuracy, horizon accuracy, insights |
| `GET /api/overview` | Metadata, cards, insights |
| `GET /api/timeseries` | Joined hourly series |
| `GET /api/accuracy` | Daily accuracy and hourly error profile |
| `GET /api/metadata` | Period, cutoff, source, data mode, record counts |

Add `?live=true` to any data endpoint to rebuild from Elexon instead of the bundled dashboard. A live rebuild is slower; repeat calls hit the file cache.

Refresh the committed extract:

```bash
cd backend && source .venv/bin/activate
python ../scripts/prefetch_january_2026.py
```

That rewrites `fuelhh_wind_january_2026.json` and `windfor_january_2026.json`. The precomputed dashboard file is what the default API path serves; regenerate it by calling the live dashboard endpoint and saving the JSON if the seed metrics need to match a new extract.

## Checks

```bash
cd backend && source .venv/bin/activate && pytest
cd frontend && npm run build
```

## Stack

React, TypeScript, Vite, FastAPI, pandas, NumPy, Docker. Frontend on Vercel, API on Render (`render.yaml`, root directory `backend`).

## Disclosure

AI tools, including Cursor, were used to design, implement, test, and document this application. The scoring rules, dataset choice, and January 2026 scope were set for this project and checked against the Elexon responses in `backend/data/seed/`.
