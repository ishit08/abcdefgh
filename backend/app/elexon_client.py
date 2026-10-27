import hashlib
import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx

from .config import (
    BASE_URL,
    CACHE_DIR,
    JANUARY_2026_END,
    JANUARY_2026_START,
    SEED_ACTUALS_PATH,
    SEED_FORECASTS_PATH,
    WINDFOR_PUBLISH_START,
)

UTC = timezone.utc


class ElexonClient:
    def __init__(self, base_url: str = BASE_URL, cache_dir: Path = CACHE_DIR):
        self.base_url = base_url.rstrip("/")
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    async def fetch_actuals(self, *, prefer_seed: bool = True) -> list[dict[str, Any]]:
        if prefer_seed and SEED_ACTUALS_PATH.exists():
            return json.loads(SEED_ACTUALS_PATH.read_text())
        rows: list[dict[str, Any]] = []
        for window_start, window_end in _settlement_date_windows():
            params = {
                "settlementDateFrom": window_start.isoformat(),
                "settlementDateTo": window_end.isoformat(),
                "format": "json",
                "fuelType": "WIND",
            }
            chunk = await self._get("/datasets/FUELHH", params)
            rows.extend(row for row in chunk if str(row.get("fuelType", "")).upper() == "WIND")
        return _filter_start_time(rows, JANUARY_2026_START, JANUARY_2026_END)

    async def fetch_forecasts(self, *, prefer_seed: bool = True) -> list[dict[str, Any]]:
        if prefer_seed and SEED_FORECASTS_PATH.exists():
            return json.loads(SEED_FORECASTS_PATH.read_text())
        rows: list[dict[str, Any]] = []
        publish_start = datetime.fromisoformat(WINDFOR_PUBLISH_START.replace("Z", "+00:00"))
        publish_end = datetime.fromisoformat(JANUARY_2026_END.replace("Z", "+00:00"))
        day = publish_start.date()
        while day < publish_end.date():
            next_day = day + timedelta(days=1)
            params = {
                "publishDateTimeFrom": f"{day.isoformat()}T00:00:00Z",
                "publishDateTimeTo": f"{next_day.isoformat()}T00:00:00Z",
                "format": "json",
            }
            rows.extend(await self._get("/datasets/WINDFOR", params))
            day = next_day
        return _filter_start_time(rows, JANUARY_2026_START, JANUARY_2026_END)

    async def _get(self, path: str, params: dict[str, Any]) -> list[dict[str, Any]]:
        cache_key = hashlib.sha256(json.dumps([path, params], sort_keys=True).encode()).hexdigest()
        cache_path = self.cache_dir / f"{cache_key}.json"
        if cache_path.exists():
            return json.loads(cache_path.read_text())

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.get(f"{self.base_url}{path}", params=params)
            response.raise_for_status()
            payload = response.json()

        rows = payload if isinstance(payload, list) else payload.get("data", [])
        cache_path.write_text(json.dumps(rows))
        return rows


def _settlement_date_windows() -> list[tuple[date, date]]:
    start = datetime.fromisoformat(JANUARY_2026_START.replace("Z", "+00:00")).date()
    end = datetime.fromisoformat(JANUARY_2026_END.replace("Z", "+00:00")).date()
    windows: list[tuple[date, date]] = []
    day = start
    while day < end:
        chunk_end = min(day + timedelta(days=6), end - timedelta(days=1))
        windows.append((day, chunk_end))
        day = chunk_end + timedelta(days=1)
    return windows


def _filter_start_time(rows: list[dict[str, Any]], start_iso: str, end_iso: str) -> list[dict[str, Any]]:
    start = datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
    end = datetime.fromisoformat(end_iso.replace("Z", "+00:00"))
    filtered: list[dict[str, Any]] = []
    for row in rows:
        raw = row.get("startTime")
        if not raw:
            continue
        ts = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        if start <= ts < end:
            filtered.append(row)
    return filtered
