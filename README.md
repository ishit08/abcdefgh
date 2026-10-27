# Elexon Wind Forecast Intelligence

Full-stack pilot dashboard for a UK utility day-ahead procurement team. It compares **Elexon BMRS** national wind **actuals** (`FUELHH`, `fuelType=WIND`) with **forecasts** (`WINDFOR`) for **January 2026**, using the latest forecast available before a **D-1 10:00 UTC** decision cutoff.

## What is included

- **Real January 2026 Elexon data** bundled under `backend/data/seed/` (generated via `scripts/prefetch_january_2026.py`).
- React dashboard: KPIs, forecast vs actual, daily error, intraday risk, sample table, method notes.
- FastAPI backend: Elexon client, caching, analytics, seed + live refresh.
- Docker Compose for local full-stack runs.

## Directory guide

```text
backend/
  app/                 FastAPI, Elexon client, analytics
  data/seed/           Committed FUELHH + WINDFOR JSON for Jan 2026
  tests/
  Dockerfile
  Procfile             Heroku-style process file
frontend/
  src/                 React dashboard
  Dockerfile
scripts/
  prefetch_january_2026.py   Re-download seed data from Elexon
docker-compose.yml
render.yaml            Example backend deploy (Render)
```

## Run locally (no Docker)

**Backend**

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend** (second terminal)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — default load uses **bundled Elexon seed** (not synthetic sample).

Optional: `GET http://localhost:8000/api/dashboard?live=true` to refresh from the Elexon API (slower; uses `backend/data/cache/`).

## Run with Docker

Start Docker Desktop, then:

```bash
docker compose up --build
```

- App: http://localhost:5173  
- API: http://localhost:8000  

## API

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Health check |
| `GET /api/dashboard` | Full payload |
| `GET /api/overview` | Cards + insights |
| `GET /api/timeseries` | Joined series |
| `GET /api/accuracy` | Daily + intraday metrics |
| `GET /api/metadata` | Source + data mode |

Query `?live=true` to bypass seed and pull from Elexon (historical params: `settlementDateFrom/To` for FUELHH, `publishDateTimeFrom/To` for WINDFOR).

## Deploy (submission)

1. **GitHub** — public repo with anonymous name; push this project.
2. **Backend** — Render / Railway / Heroku from `backend/`  
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`  
   - Env: `FRONTEND_ORIGIN=https://your-vercel-app.vercel.app`  
   - Env: `USE_ELEXON_DATA=true` (default)
3. **Frontend** — Vercel, root `frontend/`  
   - Env: `VITE_API_BASE_URL=https://your-backend-url`  
4. Update the links below and record the **10-minute unlisted YouTube** demo (client + tech review).

### Submission links (fill after deploy)

| Item | URL |
|------|-----|
| GitHub repository | _Add after push_ |
| Live application | _Add Vercel URL_ |
| Backend API | _Add Render/Heroku URL_ |
| Demo video (unlisted YouTube) | _Add after recording_ |

## Checks

```bash
cd backend && pytest
cd frontend && npm run build
python scripts/prefetch_january_2026.py   # optional refresh of seed files
```

## AI tools disclosure

AI tools (including Cursor) were used to design, implement, test, and document this application.
