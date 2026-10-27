from app.analytics import build_dashboard


def test_dashboard_contains_expected_metrics():
    data = build_dashboard(None, None)
    labels = {card["label"] for card in data["cards"]}
    assert {"MAE", "RMSE", "sMAPE", "Bias", "P90 Error", "Coverage"}.issubset(labels)
    assert len(data["timeseries"]) == 31 * 48
    assert data["daily_accuracy"]
    assert data["half_hour_profile"]


def test_decision_forecast_join_uses_latest_before_cutoff():
    actuals = [{"startTime": "2026-01-02T00:00:00Z", "fuelType": "WIND", "generation": 1000}]
    forecasts = [
        {"startTime": "2026-01-02T00:00:00Z", "publishTime": "2026-01-01T06:00:00Z", "generation": 800},
        {"startTime": "2026-01-02T00:00:00Z", "publishTime": "2026-01-01T10:00:00Z", "generation": 900},
        {"startTime": "2026-01-02T00:00:00Z", "publishTime": "2026-01-01T12:00:00Z", "generation": 1200},
    ]
    row = build_dashboard(actuals, forecasts)["timeseries"][0]
    assert row["forecastGeneration"] == 900
    assert row["error"] == -100
