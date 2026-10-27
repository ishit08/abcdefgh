const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export type MetricCard = { label: string; value: number | string; unit?: string; help: string };
export type TimePoint = {
  date: string;
  period: string;
  startTime: string;
  actualGeneration: number;
  forecastGeneration: number;
  error: number;
  absError: number;
  publishTime: string;
};
export type DailyAccuracy = { date: string; actualGeneration: number; forecastGeneration: number; mae: number; bias: number; smape: number };
export type HalfHourProfile = { period: string; mae: number; bias: number };
export type DashboardData = {
  metadata: Record<string, string | number | boolean>;
  cards: MetricCard[];
  timeseries: TimePoint[];
  daily_accuracy: DailyAccuracy[];
  half_hour_profile: HalfHourProfile[];
  forecast_snapshots: Array<Record<string, string | number>>;
  insights: string[];
};

export async function fetchDashboard(live = false): Promise<DashboardData> {
  // Default false: backend serves committed January 2026 Elexon seed data.
  const response = await fetch(`${API_BASE_URL}/api/dashboard?live=${live}`);
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json();
}
