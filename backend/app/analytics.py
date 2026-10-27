from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any

import numpy as np
import pandas as pd

DECISION_CUTOFF_HOUR = 10


def _to_utc(value: Any) -> pd.Timestamp:
    return pd.to_datetime(value, utc=True)


def _generation(row: dict[str, Any]) -> float | None:
    for key in ("generation", "quantity", "value"):
        if key in row and row[key] is not None:
            return float(row[key])
    return None


def _sample_actuals() -> list[dict[str, Any]]:
    periods = pd.date_range("2026-01-01T00:00:00Z", "2026-01-31T23:30:00Z", freq="30min")
    rows = []
    for i, ts in enumerate(periods):
        daily = 950 * math.sin((i % 48) / 48 * 2 * math.pi - 0.7)
        synoptic = 700 * math.sin(i / 220)
        generation = max(200, 5200 + daily + synoptic + 350 * math.sin(i / 19))
        rows.append({"startTime": ts.isoformat(), "fuelType": "WIND", "generation": round(generation, 2)})
    return rows


def _sample_forecasts(actuals: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = []
    for i, actual in enumerate(actuals):
        target = _to_utc(actual["startTime"])
        previous_day = (target - pd.Timedelta(days=1)).normalize()
        for hour, label, bias in [(6, "early", -180), (10, "decision", -60), (15, "late", 35)]:
            publish = previous_day + pd.Timedelta(hours=hour)
            noise = 290 * math.sin(i / 13 + hour) + 120 * math.cos(i / 37)
            rows.append({
                "startTime": target.isoformat(),
                "publishTime": publish.isoformat(),
                "generation": round(float(actual["generation"]) + bias + noise, 2),
                "snapshot": label,
            })
    return rows


def build_dashboard(actual_rows: list[dict[str, Any]] | None, forecast_rows: list[dict[str, Any]] | None) -> dict[str, Any]:
    using_sample_data = not actual_rows or not forecast_rows
    actual_rows = actual_rows or _sample_actuals()
    forecast_rows = forecast_rows or _sample_forecasts(actual_rows)

    actuals = pd.DataFrame([
        {"startTime": _to_utc(row.get("startTime")), "actualGeneration": _generation(row)}
        for row in actual_rows if row.get("startTime") and _generation(row) is not None
    ])
    forecasts = pd.DataFrame([
        {
            "startTime": _to_utc(row.get("startTime")),
            "publishTime": _to_utc(row.get("publishTime")),
            "forecastGeneration": _generation(row),
        }
        for row in forecast_rows if row.get("startTime") and row.get("publishTime") and _generation(row) is not None
    ])

    start = pd.Timestamp("2026-01-01T00:00:00Z")
    end = pd.Timestamp("2026-02-01T00:00:00Z")
    actuals = actuals[(actuals.startTime >= start) & (actuals.startTime < end)]
    forecasts = forecasts[(forecasts.startTime >= start) & (forecasts.startTime < end)]

    if actuals.empty or forecasts.empty:
        actual_rows = _sample_actuals()
        forecast_rows = _sample_forecasts(actual_rows)
        return build_dashboard(actual_rows, forecast_rows)

    forecasts["deliveryDate"] = forecasts.startTime.dt.date
    forecasts["decisionCutoff"] = forecasts.startTime.dt.normalize() - pd.Timedelta(days=1) + pd.Timedelta(hours=DECISION_CUTOFF_HOUR)
    eligible = forecasts[forecasts.publishTime <= forecasts.decisionCutoff].copy()
    if eligible.empty:
        eligible = forecasts.copy()
    latest_idx = eligible.sort_values("publishTime").groupby("startTime").tail(1).index
    decision = eligible.loc[latest_idx].copy()

    joined = actuals.merge(decision, on="startTime", how="inner").sort_values("startTime")
    joined["error"] = joined.forecastGeneration - joined.actualGeneration
    joined["absError"] = joined.error.abs()
    joined["ape"] = joined.absError / joined.actualGeneration.replace(0, np.nan) * 100
    joined["date"] = joined.startTime.dt.strftime("%Y-%m-%d")
    joined["period"] = joined.startTime.dt.strftime("%H:%M")

    mae = float(joined.absError.mean())
    rmse = float(np.sqrt(np.mean(np.square(joined.error))))
    bias = float(joined.error.mean())
    smape = float((2 * joined.absError / (joined.actualGeneration.abs() + joined.forecastGeneration.abs())).mean() * 100)
    coverage = float(len(joined) / len(actuals) * 100)
    p90 = float(joined.absError.quantile(0.9))

    daily = joined.groupby("date").agg(
        actualGeneration=("actualGeneration", "mean"),
        forecastGeneration=("forecastGeneration", "mean"),
        mae=("absError", "mean"),
        bias=("error", "mean"),
        smape=("ape", "mean"),
    ).reset_index()
    profile = joined.groupby("period").agg(mae=("absError", "mean"), bias=("error", "mean")).reset_index()

    snapshots = forecasts.assign(leadHours=(forecasts.startTime - forecasts.publishTime).dt.total_seconds() / 3600)
    snapshot_summary = snapshots.groupby(snapshots.publishTime.dt.strftime("%H:%M")).agg(
        count=("forecastGeneration", "count"),
        avgLeadHours=("leadHours", "mean"),
    ).reset_index().rename(columns={"publishTime": "publishPeriod"})

    worst_day = daily.sort_values("mae", ascending=False).iloc[0]
    bias_direction = "over-forecasting" if bias > 0 else "under-forecasting"
    insights = [
        f"Decision-time forecast coverage is {coverage:.1f}% of January half-hourly periods.",
        f"Average absolute error is {mae:.0f} MW, with P90 absolute error of {p90:.0f} MW.",
        f"The model shows net {bias_direction} of {abs(bias):.0f} MW on average.",
        f"Highest daily MAE occurs on {worst_day['date']} at {worst_day['mae']:.0f} MW.",
    ]

    return {
        "metadata": {
            "period": "January 2026",
            "decisionCutoff": f"D-1 {DECISION_CUTOFF_HOUR:02d}:00 UTC",
            "source": "Elexon BMRS FUELHH and WINDFOR datasets",
            "sampleFallback": using_sample_data,
            "records": int(len(joined)),
            "generatedAt": datetime.now(timezone.utc).isoformat(),
        },
        "cards": [
            {"label": "MAE", "value": round(mae, 1), "unit": "MW", "help": "Mean absolute decision-time forecast error."},
            {"label": "RMSE", "value": round(rmse, 1), "unit": "MW", "help": "Penalises larger forecast misses."},
            {"label": "sMAPE", "value": round(smape, 2), "unit": "%", "help": "Scale-aware forecast error percentage."},
            {"label": "Bias", "value": round(bias, 1), "unit": "MW", "help": "Positive means forecast above actual."},
            {"label": "P90 Error", "value": round(p90, 1), "unit": "MW", "help": "Nine out of ten periods miss by less than this."},
            {"label": "Coverage", "value": round(coverage, 1), "unit": "%", "help": "Actual periods matched to decision-time forecasts."},
        ],
        "timeseries": joined[["date", "period", "startTime", "actualGeneration", "forecastGeneration", "error", "absError", "publishTime"]].assign(
            startTime=lambda df: df.startTime.dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
            publishTime=lambda df: df.publishTime.dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        ).round(2).to_dict("records"),
        "daily_accuracy": daily.round(2).to_dict("records"),
        "half_hour_profile": profile.round(2).to_dict("records"),
        "forecast_snapshots": snapshot_summary.round(2).to_dict("records"),
        "insights": insights,
    }
