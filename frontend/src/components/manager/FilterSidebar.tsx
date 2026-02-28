import React from 'react';
import { ReportFilters } from '../../types/reports.types';

interface Props {
  filters: ReportFilters;
  onChange: (filters: ReportFilters) => void;
  onApply: () => void;
}

/**
 * Sidebar with date range picker and optional school / driver filters.
 * Calls `onApply` when the user clicks "Aplicar" so the parent can
 * re-fetch data.
 */
export function FilterSidebar({ filters, onChange, onApply }: Props) {
  function set(key: keyof ReportFilters, value: string): void {
    onChange({ ...filters, [key]: value || undefined });
  }

  return (
    <aside className="w-full sm:w-64 shrink-0 flex flex-col gap-4 no-print">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Filtros</h3>

      {/* Date range */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Data inicial</label>
        <input
          type="date"
          value={filters.startDate ?? ''}
          onChange={(e) => set('startDate', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Data final</label>
        <input
          type="date"
          value={filters.endDate ?? ''}
          onChange={(e) => set('endDate', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* School filter */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Escola (nome exato)</label>
        <input
          type="text"
          placeholder="Nome da escola"
          value={filters.schoolId ?? ''}
          onChange={(e) => set('schoolId', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Driver ID filter */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">ID do Motorista</label>
        <input
          type="text"
          placeholder="Ex: 3"
          value={filters.driverId ?? ''}
          onChange={(e) => set('driverId', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <button
        onClick={onApply}
        className="mt-2 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        Aplicar
      </button>

      {/* Quick ranges */}
      <div>
        <p className="text-xs text-gray-400 mb-2">Intervalos rápidos</p>
        <div className="flex flex-col gap-1.5">
          {[
            { label: 'Hoje', days: 0 },
            { label: 'Últimos 7 dias', days: 7 },
            { label: 'Últimos 30 dias', days: 30 },
            { label: 'Últimos 90 dias', days: 90 },
          ].map(({ label, days }) => (
            <button
              key={label}
              onClick={() => {
                const end = new Date();
                const start = new Date();
                start.setDate(start.getDate() - days);
                const fmt = (d: Date) => d.toISOString().slice(0, 10);
                const next: ReportFilters = { ...filters, startDate: fmt(start), endDate: fmt(end) };
                onChange(next);
                onApply();
              }}
              className="text-xs text-left text-blue-600 hover:underline py-0.5"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
