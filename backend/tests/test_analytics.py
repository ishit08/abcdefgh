from app.analytics import build_dashboard


def test_dashboard_contains_expected_metrics():
    data = build_dashboard(None, None)
    labels = {card["label"] for card in data["cards"]}
    assert {"MAE", "RMSE", "sMAPE", "Bias", "P90 Error", "Within 1GW"}.issubset(labels)
    assert len(data["timeseries"]) == 31 * 24
    assert data["metadata"]["resolution"] == "Hourly forecast scored against hourly mean actual generation"
    assert data["daily_accuracy"]
    assert data["half_hour_profile"]
    assert data["horizon_accuracy"]


def test_decision_forecast_join_uses_latest_before_cutoff():
    actuals = [
        {"startTime": "2026-01-02T00:00:00Z", "fuelType": "WIND", "generation": 1000},
        {"startTime": "2026-01-02T00:30:00Z", "fuelType": "WIND", "generation": 1200},
    ]
    forecasts = [
        {"startTime": "2026-01-02T00:00:00Z", "publishTime": "2026-01-01T06:00:00Z", "generation": 800},
        {"startTime": "2026-01-02T00:00:00Z", "publishTime": "2026-01-01T10:00:00Z", "generation": 900},
        {"startTime": "2026-01-02T00:00:00Z", "publishTime": "2026-01-01T12:00:00Z", "generation": 1200},
    ]
    row = build_dashboard(actuals, forecasts)["timeseries"][0]
    assert row["actualGeneration"] == 1100
    assert row["forecastGeneration"] == 900
    assert row["error"] == -200


def test_seed_like_data_reports_full_hourly_coverage():
    actuals = []
    forecasts = []
    for hour in range(24):
        actuals.append({"startTime": f"2026-01-03T{hour:02d}:00:00Z", "fuelType": "WIND", "generation": 1000})
        actuals.append({"startTime": f"2026-01-03T{hour:02d}:30:00Z", "fuelType": "WIND", "generation": 1200})
        forecasts.append({"startTime": f"2026-01-03T{hour:02d}:00:00Z", "publishTime": "2026-01-02T10:00:00Z", "generation": 1300})
    data = build_dashboard(actuals, forecasts)
    assert data["metadata"]["records"] == 24
    assert data["cards"][-1]["label"] == "Within 1GW"
