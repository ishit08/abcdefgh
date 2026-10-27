from pydantic import BaseModel
from typing import Any

class MetricCard(BaseModel):
    label: str
    value: float | str
    unit: str | None = None
    help: str

class ApiResponse(BaseModel):
    metadata: dict[str, Any]
    cards: list[MetricCard]
    timeseries: list[dict[str, Any]]
    daily_accuracy: list[dict[str, Any]]
    half_hour_profile: list[dict[str, Any]]
    forecast_snapshots: list[dict[str, Any]]
    insights: list[str]
