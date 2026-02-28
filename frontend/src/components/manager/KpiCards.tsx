import React from 'react';
import { SummaryReport, StockReport } from '../../types/reports.types';

interface Props {
  summary: SummaryReport | null;
  stock: StockReport | null;
}

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: string;
  colorClass: string;
  subLabel?: string;
}

function KpiCard({ label, value, icon, colorClass, subLabel }: KpiCardProps) {
  return (
    <div className={`rounded-xl border bg-white p-5 flex items-start gap-4 shadow-sm ${colorClass}`}>
      <span className="text-3xl mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {subLabel && <p className="text-xs text-gray-400 mt-0.5">{subLabel}</p>}
      </div>
    </div>
  );
}

/**
 * Four KPI cards at the top of the manager dashboard:
 * - Open requests (pending + approved + in_progress)
 * - In transit
 * - Delivered (total all-time from summary)
 * - Critical stock alerts
 */
export function KpiCards({ summary, stock }: Props) {
  const openRequests = summary
    ? (summary.byStatus['pending'] ?? 0) +
      (summary.byStatus['approved'] ?? 0) +
      (summary.byStatus['in_progress'] ?? 0)
    : '—';

  const inTransit = summary ? (summary.byStatus['in_transit'] ?? 0) : '—';
  const delivered = summary ? (summary.byStatus['delivered'] ?? 0) : '—';
  const criticalAlerts = stock ? stock.alerts.length : '—';

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <KpiCard
        label="Pedidos Abertos"
        value={openRequests}
        icon="📋"
        colorClass="border-blue-100"
        subLabel="pendente / aprovado / separação"
      />
      <KpiCard
        label="Em Trânsito"
        value={inTransit}
        icon="🚐"
        colorClass="border-yellow-100"
      />
      <KpiCard
        label="Entregues"
        value={delivered}
        icon="✅"
        colorClass="border-green-100"
      />
      <KpiCard
        label="Alertas de Estoque"
        value={criticalAlerts}
        icon="⚠️"
        colorClass={
          typeof criticalAlerts === 'number' && criticalAlerts > 0
            ? 'border-red-200 bg-red-50'
            : 'border-gray-100'
        }
        subLabel="itens abaixo do mínimo"
      />
    </div>
  );
}
