import { useEffect, useMemo, useState } from 'react';
import { Activity, Database, RefreshCw, Wind } from 'lucide-react';
import { DailyAccuracyChart, ForecastVsActual, IntradayRiskChart } from './components/Charts';
import { MetricCard } from './components/MetricCard';
import { DashboardData, fetchDashboard } from './services/api';
import './styles/app.css';

function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchDashboard(live).then(setData).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [live]);

  const tableRows = useMemo(() => data?.timeseries.slice(0, 12) ?? [], [data]);

  return <main>
    <section className="hero">
      <div>
        <div className="eyebrow"><Wind size={18} /> Elexon wind forecast intelligence</div>
        <h1>Day-ahead wind forecast risk for UK power procurement</h1>
        <p>National-level January 2026 dashboard combining Elexon FUELHH actual wind generation and WINDFOR forecasts into decision-ready accuracy metrics.</p>
        <div className="hero-actions">
          <button onClick={() => setLive((value) => !value)}><RefreshCw size={16} /> {live ? 'Use bundled Jan 2026 data' : 'Refresh from Elexon API'}</button>
          <span><Database size={16} /> {live ? 'Live Elexon refresh' : 'Bundled Elexon Jan 2026 seed'}</span>
        </div>
      </div>
      <aside>
        <Activity size={28} />
        <strong>{data?.metadata.period ?? 'January 2026'}</strong>
        <span>Decision cutoff: {data?.metadata.decisionCutoff ?? 'D-1 10:00 UTC'}</span>
      </aside>
    </section>

    {loading ? <div className="status">Loading forecast intelligence...</div> : null}
    {error ? <div className="status error">{error}</div> : null}

    {data ? <>
      {data.metadata.warning ? <div className="status warning">{String(data.metadata.warning)}</div> : null}
      <section className="metrics">{data.cards.map((card) => <MetricCard key={card.label} card={card} />)}</section>
      <section className="insights panel"><h2>Trading desk takeaways</h2>{data.insights.map((insight) => <p key={insight}>{insight}</p>)}</section>
      <ForecastVsActual data={data.timeseries} />
      <div className="grid"><DailyAccuracyChart data={data.daily_accuracy} /><IntradayRiskChart data={data.half_hour_profile} /></div>
      <section className="panel"><div className="panel-heading"><h2>Sample settlement periods</h2><p>First twelve joined records, including the forecast publish time used for the decision snapshot.</p></div><div className="table-wrap"><table><thead><tr><th>Delivery</th><th>Period</th><th>Actual MW</th><th>Forecast MW</th><th>Error MW</th><th>Published</th></tr></thead><tbody>{tableRows.map((row) => <tr key={row.startTime}><td>{row.date}</td><td>{row.period}</td><td>{row.actualGeneration.toFixed(0)}</td><td>{row.forecastGeneration.toFixed(0)}</td><td className={row.error >= 0 ? 'positive' : 'negative'}>{row.error.toFixed(0)}</td><td>{new Date(row.publishTime).toLocaleString()}</td></tr>)}</tbody></table></div></section>
      <section className="panel explainer"><h2>Method</h2><p>The backend selects the latest forecast published at or before D-1 10:00 UTC for each half-hour delivery period, joins it to actual wind generation, then calculates MAE, RMSE, sMAPE, bias, P90 error, daily accuracy and intraday risk. This matches the question the procurement team faces before entering the day-ahead market.</p></section>
    </> : null}
  </main>;
}

export default App;
