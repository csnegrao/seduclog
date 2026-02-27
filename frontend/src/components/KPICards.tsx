import type { KPIData } from '../types';

interface Props {
  data: KPIData | null;
}

export default function KPICards({ data }: Props) {
  const cards = [
    {
      label: 'Pedidos Abertos',
      value: data?.open_requests ?? '—',
      color: '#3b82f6',
      bg: '#eff6ff',
      icon: '📋',
    },
    {
      label: 'Em Trânsito',
      value: data?.in_transit ?? '—',
      color: '#f97316',
      bg: '#fff7ed',
      icon: '🚚',
    },
    {
      label: 'Entregues Hoje',
      value: data?.delivered_today ?? '—',
      color: '#22c55e',
      bg: '#f0fdf4',
      icon: '✅',
    },
    {
      label: 'Alertas de Estoque',
      value: data?.critical_stock_alerts ?? '—',
      color: '#ef4444',
      bg: '#fef2f2',
      icon: '⚠️',
    },
  ];

  return (
    <div className="kpi-grid">
      {cards.map((card) => (
        <div
          key={card.label}
          className="kpi-card"
          style={{ borderLeft: `4px solid ${card.color}`, background: card.bg }}
        >
          <div className="kpi-icon">{card.icon}</div>
          <div className="kpi-body">
            <div className="kpi-value" style={{ color: card.color }}>
              {card.value}
            </div>
            <div className="kpi-label">{card.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
