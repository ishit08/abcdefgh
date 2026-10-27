import type { MetricCard as MetricCardType } from '../services/api';

export function MetricCard({ card }: { card: MetricCardType }) {
  return <article className="metric-card">
    <p>{card.label}</p>
    <strong>{card.value}{card.unit ? <span> {card.unit}</span> : null}</strong>
    <small>{card.help}</small>
  </article>;
}
