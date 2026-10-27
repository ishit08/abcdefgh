import json
import os
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from .analytics import build_dashboard
from .config import FRONTEND_ORIGIN, SEED_DASHBOARD_PATH
from .elexon_client import ElexonClient

app = FastAPI(title="Elexon Wind Forecast Intelligence", version="1.0.0")

_extra_origins = [origin.strip() for origin in FRONTEND_ORIGIN.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[*_extra_origins, "http://localhost:5173", "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1):\d+|https://[\w-]+\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

client = ElexonClient()
_seed_dashboard: dict | None = None


def _cached_seed_dashboard() -> dict:
    global _seed_dashboard
    if _seed_dashboard is None:
        if not SEED_DASHBOARD_PATH.exists():
            raise FileNotFoundError(f"Missing precomputed dashboard seed: {SEED_DASHBOARD_PATH}")
        _seed_dashboard = json.loads(SEED_DASHBOARD_PATH.read_text())
    return _seed_dashboard


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


async def _dashboard(live: bool = False) -> dict:
    if not live and SEED_DASHBOARD_PATH.exists():
        return _cached_seed_dashboard()

    use_elexon = live or os.getenv("USE_ELEXON_DATA", "true").lower() in {"1", "true", "yes"}
    if use_elexon:
        try:
            actuals = await client.fetch_actuals(prefer_seed=not live)
            forecasts = await client.fetch_forecasts(prefer_seed=not live)
            if actuals and forecasts:
                data = build_dashboard(actuals, forecasts)
                data["metadata"]["dataMode"] = "live" if live else "seed"
                return data
        except Exception as exc:
            data = build_dashboard(None, None)
            data["metadata"]["warning"] = f"Elexon data load failed, using sample data: {exc}"
            data["metadata"]["dataMode"] = "sample"
            return data
    data = build_dashboard(None, None)
    data["metadata"]["dataMode"] = "sample"
    return data


@app.get("/api/dashboard")
async def dashboard(
    live: bool = Query(False, description="Refresh from Elexon API instead of bundled January 2026 seed data."),
) -> dict:
    return await _dashboard(live=live)


@app.get("/api/overview")
async def overview(live: bool = False) -> dict:
    data = await _dashboard(live=live)
    return {"metadata": data["metadata"], "cards": data["cards"], "insights": data["insights"]}


@app.get("/api/timeseries")
async def timeseries(live: bool = False) -> dict:
    data = await _dashboard(live=live)
    return {"timeseries": data["timeseries"]}


@app.get("/api/accuracy")
async def accuracy(live: bool = False) -> dict:
    data = await _dashboard(live=live)
    return {"daily_accuracy": data["daily_accuracy"], "half_hour_profile": data["half_hour_profile"]}


@app.get("/api/metadata")
async def metadata(live: bool = False) -> dict:
    data = await _dashboard(live=live)
    return data["metadata"]
