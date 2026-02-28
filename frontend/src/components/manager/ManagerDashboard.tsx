import React, { useCallback, useEffect, useState } from 'react';
import { useReports } from '../../hooks/useReports';
import { ReportFilters } from '../../types/reports.types';
import { KpiCards } from './KpiCards';
import { DeliveryVolumeChart } from './DeliveryVolumeChart';
import { TopProductsChart } from './TopProductsChart';
import { DeliveriesTable } from './DeliveriesTable';
import { FilterSidebar } from './FilterSidebar';
import { ReportExporter } from './ReportExporter';
import { DeliveryOrder } from '../../types/warehouse.types';

/**
 * Manager Dashboard.
 *
 * Combines:
 *  - FilterSidebar (date range + school/driver filters)
 *  - KpiCards (open, in-transit, delivered, critical stock)
 *  - DeliveryVolumeChart (line chart)
 *  - TopProductsChart (bar chart)
 *  - DeliveriesTable (with divergences)
 *  - ReportExporter (PDF / Excel)
 */
export function ManagerDashboard() {
  const {
    loading,
    error,
    summary,
    deliveries,
    stock,
    performance,
    divergences,
    fetchAll,
    exportExcel,
    exportPdf,
  } = useReports();

  const [filters, setFilters] = useState<ReportFilters>(() => {
    // Default: last 30 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  });

  const applyFilters = useCallback(() => {
    void fetchAll(filters);
  }, [fetchAll, filters]);

  // Initial load
  useEffect(() => {
    void fetchAll(filters);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // Build partial DeliveryOrder objects from divergence records for the
  // deliveries table.  Only divergent orders are shown, which is the most
  // actionable view for a manager. In a real app a dedicated endpoint would
  // return all recent orders.
  const tableDeliveries: DeliveryOrder[] = (divergences ?? []).map((d) => ({
    id: d.orderId,
    requestId: '',
    requestProtocol: d.requestProtocol,
    school: d.school,
    driverId: '',
    driverName: d.driverName,
    vehicleId: '',
    vehiclePlate: '',
    status: 'delivered' as const,
    picklist: [],
    deliveredAt: d.deliveredAt,
    createdAt: d.deliveredAt,
    updatedAt: d.deliveredAt,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between no-print">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Dashboard do Gestor</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Visão gerencial em tempo real dos pedidos e entregas
          </p>
        </div>

        <ReportExporter
          onExportPdf={exportPdf}
          onExportExcel={exportExcel}
          filters={filters}
        />
      </header>

      {/* Body */}
      <div className="flex gap-6 p-6 max-w-screen-xl mx-auto">
        {/* Sidebar */}
        <FilterSidebar
          filters={filters}
          onChange={setFilters}
          onApply={applyFilters}
        />

        {/* Main content */}
        <main className="flex-1 min-w-0 flex flex-col gap-6">
          {/* Loading indicator */}
          {loading && (
            <div className="flex items-center gap-2 text-blue-600 text-sm">
              <span className="inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              Carregando relatórios…
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* KPI Cards */}
          <KpiCards summary={summary} stock={stock} />

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Delivery volume chart */}
            <section className="rounded-xl bg-white border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Volume Diário de Entregas
              </h2>
              <DeliveryVolumeChart data={summary?.dailyVolume ?? []} />
            </section>

            {/* Top products chart */}
            <section className="rounded-xl bg-white border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Top 10 Produtos Mais Solicitados
              </h2>
              <TopProductsChart data={stock?.topProducts ?? []} />
            </section>
          </div>

          {/* Delivery performance metrics */}
          {deliveries && (
            <section className="rounded-xl bg-white border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Performance de Entrega
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <Metric label="Total de Ordens" value={deliveries.total} />
                <Metric label="Entregues" value={deliveries.deliveredCount} />
                <Metric
                  label="Taxa no Prazo"
                  value={
                    deliveries.onTimeRate !== null ? `${deliveries.onTimeRate}%` : '—'
                  }
                />
                <Metric
                  label="Tempo Médio"
                  value={
                    deliveries.avgDeliveryTimeMin !== null
                      ? `${deliveries.avgDeliveryTimeMin} min`
                      : '—'
                  }
                />
              </div>

              {/* By-school breakdown */}
              {deliveries.bySchool.length > 0 && (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-xs font-semibold uppercase text-gray-500 border-b border-gray-200">
                        <th className="py-2 text-left pr-4">Escola</th>
                        <th className="py-2 text-right pr-4">Total</th>
                        <th className="py-2 text-right pr-4">Entregues</th>
                        <th className="py-2 text-right">Em Trânsito</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveries.bySchool.map((s) => (
                        <tr key={s.school} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 pr-4">{s.school}</td>
                          <td className="py-2 pr-4 text-right">{s.total}</td>
                          <td className="py-2 pr-4 text-right text-green-700">{s.delivered}</td>
                          <td className="py-2 text-right text-orange-600">{s.inTransit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* Driver performance */}
          {performance && performance.length > 0 && (
            <section className="rounded-xl bg-white border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Performance por Motorista
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-xs font-semibold uppercase text-gray-500 border-b border-gray-200">
                      <th className="py-2 text-left pr-4">Motorista</th>
                      <th className="py-2 text-right pr-4">Total</th>
                      <th className="py-2 text-right pr-4">Entregues</th>
                      <th className="py-2 text-right pr-4">No Prazo (%)</th>
                      <th className="py-2 text-right pr-4">Tempo Médio</th>
                      <th className="py-2 text-right">Ocorrências</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performance.map((p) => (
                      <tr key={p.driverId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 pr-4 font-medium">{p.driverName}</td>
                        <td className="py-2 pr-4 text-right">{p.totalDeliveries}</td>
                        <td className="py-2 pr-4 text-right text-green-700">{p.deliveredCount}</td>
                        <td className="py-2 pr-4 text-right">
                          {p.onTimeRate !== null ? `${p.onTimeRate}%` : '—'}
                        </td>
                        <td className="py-2 pr-4 text-right">
                          {p.avgDeliveryTimeMin !== null ? `${p.avgDeliveryTimeMin} min` : '—'}
                        </td>
                        <td className="py-2 text-right">
                          <span
                            className={`font-semibold ${
                              p.occurrenceCount > 0 ? 'text-red-600' : 'text-gray-400'
                            }`}
                          >
                            {p.occurrenceCount}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Critical stock alerts */}
          {stock && stock.alerts.length > 0 && (
            <section className="rounded-xl bg-red-50 border border-red-200 p-5">
              <h2 className="text-sm font-semibold text-red-700 mb-3">
                ⚠️ Alertas de Estoque Crítico ({stock.alerts.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {stock.alerts.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-lg bg-white border border-red-200 px-4 py-3 text-sm"
                  >
                    <p className="font-medium text-gray-800">{a.name}</p>
                    <p className="text-red-600 mt-0.5">
                      Estoque: {a.stock} / Mín: {a.minStock}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recent deliveries table */}
          <section className="rounded-xl bg-white border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Entregas Recentes com Divergências
            </h2>
            <DeliveriesTable
              deliveries={tableDeliveries}
              divergences={divergences ?? []}
            />
            {divergences?.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-4">
                Nenhuma divergência encontrada no período
              </p>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

// ─── Small metric cell ────────────────────────────────────────────────────────

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}
