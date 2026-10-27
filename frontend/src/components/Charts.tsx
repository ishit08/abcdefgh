import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DailyAccuracy, HalfHourProfile, TimePoint } from '../services/api';

export function ForecastVsActual({ data }: { data: TimePoint[] }) {
  const sampled = data.filter((_, index) => index % 8 === 0);
  return <section className="panel wide">
    <div className="panel-heading"><h2>Decision-time forecast vs actual wind</h2><p>Four-hour sampled view across January 2026.</p></div>
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={sampled}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" minTickGap={48} /><YAxis unit=" MW" /><Tooltip /><Legend /><Line dataKey="actualGeneration" name="Actual" stroke="#0f766e" strokeWidth={2} dot={false} /><Line dataKey="forecastGeneration" name="Forecast" stroke="#2563eb" strokeWidth={2} dot={false} /></LineChart>
    </ResponsiveContainer>
  </section>;
}

export function DailyAccuracyChart({ data }: { data: DailyAccuracy[] }) {
  return <section className="panel"><div className="panel-heading"><h2>Daily forecast error</h2><p>Mean absolute error by delivery day.</p></div><ResponsiveContainer width="100%" height={280}><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" minTickGap={18} /><YAxis unit=" MW" /><Tooltip /><Bar dataKey="mae" name="MAE" fill="#f97316" /></BarChart></ResponsiveContainer></section>;
}

export function IntradayRiskChart({ data }: { data: HalfHourProfile[] }) {
  return <section className="panel"><div className="panel-heading"><h2>Intraday risk profile</h2><p>Average miss by settlement period.</p></div><ResponsiveContainer width="100%" height={280}><AreaChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" minTickGap={24} /><YAxis unit=" MW" /><Tooltip /><Area dataKey="mae" name="MAE" fill="#60a5fa" stroke="#2563eb" /></AreaChart></ResponsiveContainer></section>;
}
