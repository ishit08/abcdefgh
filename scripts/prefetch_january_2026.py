#!/usr/bin/env python3
"""Download Elexon FUELHH (WIND) and WINDFOR for January 2026 into backend/data/seed."""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.config import SEED_ACTUALS_PATH, SEED_FORECASTS_PATH, SEED_DIR  # noqa: E402
from app.elexon_client import ElexonClient  # noqa: E402


async def main() -> None:
    SEED_DIR.mkdir(parents=True, exist_ok=True)
    client = ElexonClient()
    actuals = await client.fetch_actuals(prefer_seed=False)
    forecasts = await client.fetch_forecasts(prefer_seed=False)
    SEED_ACTUALS_PATH.write_text(json.dumps(actuals, indent=2))
    SEED_FORECASTS_PATH.write_text(json.dumps(forecasts, indent=2))
    print(f"Wrote {len(actuals)} actual rows -> {SEED_ACTUALS_PATH}")
    print(f"Wrote {len(forecasts)} forecast rows -> {SEED_FORECASTS_PATH}")


if __name__ == "__main__":
    asyncio.run(main())
