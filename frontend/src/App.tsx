import { useEffect, useMemo, useState } from 'react';
import { Database, RefreshCw, Wind } from 'lucide-react';
import type { DailyAccuracy, DashboardData, HorizonAccuracy, TimePoint } from './services/api';
import { fetchDashboard } from './services/api';
import './styles/app.css';

const formatMw = (value: number | string | undefined, decimals = 0) =>
  typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals }) : value ?? '—';
const formatDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function modeLabel(data: DashboardData | null, live: boolean) {
  if (live) return 'Live Elexon refresh';
  if (data?.metadata.dataMode === 'seed') return 'Bundled Elexon Jan 2026 seed';
  return 'Stable sample fallback';
}

function MiniSparkline({ data, color = 'var(--forecast)' }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((value, index) => `${index * (60 / Math.max(1, data.length - 1))},${24 - ((value - min) / range) * 20}`).join(' ');
  return <svg className="mini-spark" viewBox="0 0 60 28" aria-hidden="true"><polyline points={points} fill="none" stroke={color} strokeWidth="1.5" /></svg>;
}

function DataHorizon({ data }: { data: TimePoint[] }) {
  const slice = data.filter((point) => point.date >= '2026-01-12' && point.date <= '2026-01-18');
  const values = slice.flatMap((point) => [point.actualGeneration, point.forecastGeneration]);
  const max = Math.max(...values, 1);
  const x = (index: number) => index * (100 / Math.max(1, slice.length - 1));
  const y = (value: number) => 96 - (value / max) * 80;
  const actual = slice.map((point, index) => `${x(index)},${y(point.actualGeneration)}`).join(' ');
  const forecast = slice.map((point, index) => `${x(index)},${y(point.forecastGeneration)}`).join(' ');
  return <svg className="hero-horizon" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Actual and forecast wind line chart for 12 to 18 January 2026">
    <polyline points={forecast} fill="none" stroke="var(--forecast)" strokeWidth="0.35" strokeDasharray="0.6 1" opacity="0.75" />
    <polyline points={actual} fill="none" stroke="var(--actual)" strokeWidth="0.5" />
    <text x="88" y="12" textAnchor="end" className="svg-label">GB wind · 12–18 Jan · actual vs D-1 forecast</text>
  </svg>;
}

function BriefingHero({ data, live, setLive }: { data: DashboardData | null; live: boolean; setLive: (value: boolean) => void }) {
  const summary = data?.summary;
  return <section className="briefing-hero" id="briefing">
    <div className="topbar">
      <div className="wordmark"><Wind size={15} /> <strong>Wind Forecast</strong><span>Intelligence</span></div>
      <div className="mode-pill"><span className="active">Briefing</span><button onClick={() => document.getElementById('desk')?.scrollIntoView({ behavior: 'smooth' })}>Desk</button></div>
      <div className="source-label">Elexon BMRS · FUELHH + WINDFOR · January 2026</div>
    </div>
    <div className="hero-copy">
      <p className="mono-eyebrow">D-1 · 10:00 UTC · the buying decision</p>
      <h1>Buy for the wind<br /><em>that actually arrives</em></h1>
      <p>Every January hour, the day-ahead wind forecast against what GB wind really generated, and what that gap means for your procurement.</p>
      <div className="hero-actions">
        <button onClick={() => setLive(!live)}><RefreshCw size={16} /> {live ? 'Use bundled seed' : 'Refresh from Elexon'}</button>
        <span><Database size={16} /> {modeLabel(data, live)}</span>
      </div>
    </div>
    {data ? <DataHorizon data={data.timeseries} /> : null}
    <div className="hero-ticker">
      <article><strong>{data?.metadata.records ?? '—'}</strong><span>delivery hours scored</span></article>
      <article><strong>{formatMw(summary?.mae)} MW</strong><span>mean absolute error</span></article>
      <article className="signal"><strong>{summary?.bias && summary.bias > 0 ? '+' : ''}{formatMw(summary?.bias)} MW</strong><span>average forecast bias</span></article>
      <article><strong>{formatMw(summary?.within1gw, 1)}%</strong><span>of hours within ±1 GW</span></article>
    </div>
  </section>;
}

function BriefingStory({ data }: { data: DashboardData }) {
  const week = data.timeseries.filter((point) => point.date >= '2026-01-12' && point.date <= '2026-01-18');
  const daily = data.daily_accuracy;
  return <section className="briefing-story">
    <div className="section-intro">
      <p className="mono-eyebrow">01 / 04</p>
      <h2>What the desk saw at 10:00</h2>
      <p>The forecast was often directionally useful, but the gap itself is the operational risk. In this week, a Monday morning run was more than 6 GW above outturn.</p>
    </div>
    <ForecastChart data={week} compact={false} />
    <div className="story-steps">
      <article><span>01</span><h3>Forecast first</h3><p>Latest WINDFOR run before the D-1 10:00 UTC cutoff.</p></article>
      <article><span>02</span><h3>Outturn next</h3><p>FUELHH wind actuals averaged to the same hourly target.</p></article>
      <article><span>03</span><h3>Then the gap</h3><p>Orange is reserved for the miss the trading desk must cover.</p></article>
    </div>
    <Marquee text={`+${formatMw(data.summary.bias)} MW average over-forecast`} />
    <div className="briefing-grid">
      <HorizonBars data={data.horizon_accuracy} />
      <DailyHeatStrip data={daily} />
    </div>
  </section>;
}

function Marquee({ text }: { text: string }) {
  return <div className="marquee" aria-label={text}><div>{Array.from({ length: 8 }).map((_, index) => <span key={index}>{text}</span>)}</div></div>;
}

function ForecastChart({ data, compact }: { data: TimePoint[]; compact: boolean }) {
  if (!data.length) return null;
  const values = data.flatMap((point) => [point.actualGeneration, point.forecastGeneration]);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pad = compact ? 14 : 28;
  const width = 760;
  const height = compact ? 190 : 300;
  const x = (index: number) => pad + index * ((width - pad * 2) / Math.max(1, data.length - 1));
  const y = (value: number) => pad + (1 - (value - min) / range) * (height - pad * 2);
  const path = (key: 'actualGeneration' | 'forecastGeneration') => data.map((point, index) => `${x(index)} ${y(point[key])}`).join(' L ');
  const gapPath = `M ${data.map((point, index) => `${x(index)} ${y(Math.max(point.actualGeneration, point.forecastGeneration))}`).join(' L ')} L ${data.slice().reverse().map((point, reverseIndex) => `${x(data.length - 1 - reverseIndex)} ${y(point.actualGeneration)}`).join(' L ')} Z`;
  const tooltip = data[Math.min(2, data.length - 1)];
  return <section className="chart-panel">
    <div className="panel-heading"><h3>Forecast vs outturn · 12–18 Jan</h3><div className="legend"><span className="actual">Actual</span><span className="forecast">Forecast</span><span className="gap">Over-forecast gap</span></div></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Forecast versus actual wind generation line chart">
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => <line key={tick} x1={pad} x2={width - pad} y1={pad + tick * (height - pad * 2)} y2={pad + tick * (height - pad * 2)} className="grid-line" />)}
      <path d={gapPath} className="gap-fill" />
      <path d={`M ${path('forecastGeneration')}`} className="forecast-line" />
      <path d={`M ${path('actualGeneration')}`} className="actual-line" />
      {!compact && tooltip ? <g className="chart-tooltip">
        <line x1={x(2)} x2={x(2)} y1={pad} y2={height - pad} />
        <rect x={x(2) + 10} y={pad + 12} width="164" height="58" rx="8" />
        <text x={x(2) + 20} y={pad + 30}>{formatDate(tooltip.date)} · {tooltip.period}</text>
        <text x={x(2) + 20} y={pad + 45}>Forecast {formatMw(tooltip.forecastGeneration)} MW</text>
        <text x={x(2) + 20} y={pad + 60}>Actual {formatMw(tooltip.actualGeneration)} MW</text>
      </g> : null}
    </svg>
  </section>;
}

function HorizonBars({ data }: { data: HorizonAccuracy[] }) {
  const max = Math.max(...data.map((row) => row.mae), 1);
  return <section className="side-panel">
    <div className="panel-heading"><h3>Error by forecast lead time</h3><span>MAE, MW</span></div>
    <div className="horizon-bars">
      {data.map((row, index) => <div className="bar-row" key={row.bucket}>
        <span>{row.bucket}</span>
        <div><i style={{ width: `${(row.mae / max) * 100}%`, opacity: 0.55 + index * 0.07 }} /></div>
        <b>{formatMw(row.mae)}</b>
      </div>)}
    </div>
    <p className="note">Waiting for a later run only cuts error from <strong>{formatMw(data[data.length - 1]?.mae)} MW</strong> to <strong>{formatMw(data[0]?.mae)} MW</strong>. Bias stays positive across horizons.</p>
  </section>;
}

function DailyHeatStrip({ data }: { data: DailyAccuracy[] }) {
  const max = Math.max(...data.map((day) => day.mae), 1);
  const min = Math.min(...data.map((day) => day.mae), 0);
  return <section className="heat-panel">
    <div className="panel-heading"><h3>Daily mean absolute error</h3><span>Worst day: {formatDate([...data].sort((a, b) => b.mae - a.mae)[0]?.date ?? '')}</span></div>
    <div className="heat-strip">
      {data.map((day) => {
        const ratio = (day.mae - min) / (max - min || 1);
        const level = ratio > 0.66 ? 'hot' : ratio > 0.33 ? 'mid' : 'cool';
        return <button className={level} key={day.date} title={`${formatDate(day.date)} · MAE ${formatMw(day.mae)} MW`}><span>{new Date(`${day.date}T00:00:00Z`).getUTCDate()}</span></button>;
      })}
    </div>
    <div className="scale"><span>{formatMw(min)} MW</span><span>Lower error</span><span>Higher error</span><span>{formatMw(max)} MW</span></div>
  </section>;
}

function Desk({ data }: { data: DashboardData }) {
  const week = data.timeseries.filter((point) => point.date >= '2026-01-12' && point.date <= '2026-01-18');
  const cards = [
    { label: 'Mean absolute error', value: `${formatMw(data.summary.mae)} MW`, help: `${(data.summary.mae / data.summary.meanActual * 100).toFixed(1)}% of mean wind output`, tone: '', spark: data.daily_accuracy.map((day) => day.mae) },
    { label: 'Bias', value: `${data.summary.bias > 0 ? '+' : ''}${formatMw(data.summary.bias)} MW`, help: 'Forecast above outturn on average', tone: 'risk', spark: [] },
    { label: 'P90 absolute error', value: `${formatMw(data.summary.p90)} MW`, help: '9 in 10 hours miss by less', tone: '', spark: [] },
    { label: 'Hours within ±1 GW', value: `${formatMw(data.summary.within1gw, 1)}%`, help: `${Math.round(data.summary.within1gw / 100 * Number(data.metadata.records))} of ${data.metadata.records} hours`, tone: '', spark: [] },
  ];
  return <section className="desk" id="desk">
    <aside className="rail">
      <div className="workspace"><i>W</i><span>Day-ahead desk</span></div>
      {['Overview', 'Accuracy', 'Settlement periods', 'Method'].map((item, index) => <a className={index === 0 ? 'active' : ''} href={`#${index === 0 ? 'desk' : 'method'}`} key={item}>{item}<small>⌘{index + 1}</small></a>)}
      <div className="rail-section">Datasets</div>
      <a href="#method">FUELHH · WIND<small>1,488</small></a>
      <a href="#method">WINDFOR<small>18,080</small></a>
      <p>Bundled Elexon seed · refreshed via <code>prefetch_january_2026.py</code></p>
    </aside>
    <div className="desk-main">
      <div className="desk-header">
        <div><h2>January 2026 forecast risk</h2><p>{String(data.metadata.resolution)} · scored against FUELHH wind outturn.</p></div>
        <div className="chips"><span>Period 1–31 Jan</span><span>Cutoff {String(data.metadata.decisionCutoff)}</span><span>Resolution Hourly</span></div>
      </div>
      <div className="kpi-grid">{cards.map((card) => <article className={`kpi ${card.tone}`} key={card.label}><label>{card.label}</label><strong>{card.value}</strong><p>{card.help}</p>{card.spark.length ? <MiniSparkline data={card.spark} /> : null}</article>)}</div>
      <div className="desk-grid"><ForecastChart data={week} compact={false} /><HorizonBars data={data.horizon_accuracy} /></div>
      <DailyHeatStrip data={data.daily_accuracy} />
      <section className="method" id="method"><h3>Method</h3><p>The backend averages FUELHH half-hourly wind actuals to hourly periods, selects the latest WINDFOR forecast published at or before D-1 10:00 UTC, joins by target hour, then calculates MAE, RMSE, sMAPE, bias, P90 error, horizon accuracy and daily risk. This keeps the scoring resolution aligned with WINDFOR.</p></section>
    </div>
  </section>;
}

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

  const status = useMemo(() => {
    if (loading) return 'Loading forecast intelligence...';
    if (error) return error;
    if (data?.metadata.warning) return String(data.metadata.warning);
    return '';
  }, [data, error, loading]);

  return <main>
    <BriefingHero data={data} live={live} setLive={setLive} />
    {status ? <div className={`status ${error ? 'error' : data?.metadata.warning ? 'warning' : ''}`}>{status}</div> : null}
    {data ? <><BriefingStory data={data} /><Desk data={data} /></> : null}
  </main>;
}

export default App;
