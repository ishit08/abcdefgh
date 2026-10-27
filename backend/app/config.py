import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE_URL = os.getenv("ELEXON_BASE_URL", "https://data.elexon.co.uk/bmrs/api/v1")
CACHE_DIR = Path(os.getenv("CACHE_DIR", ROOT / "backend/data/cache"))
SEED_DIR = Path(os.getenv("SEED_DIR", ROOT / "backend/data/seed"))
SEED_ACTUALS_PATH = SEED_DIR / "fuelhh_wind_january_2026.json"
SEED_FORECASTS_PATH = SEED_DIR / "windfor_january_2026.json"
SEED_DASHBOARD_PATH = SEED_DIR / "dashboard_january_2026.json"
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
JANUARY_2026_START = "2026-01-01T00:00:00Z"
JANUARY_2026_END = "2026-02-01T00:00:00Z"
# Forecasts published from late Dec 2025 support D-1 day-ahead decisions for January delivery.
WINDFOR_PUBLISH_START = "2025-12-30T00:00:00Z"
