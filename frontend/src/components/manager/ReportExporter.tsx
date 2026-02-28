import React, { useState } from 'react';
import { ReportFilters } from '../../types/reports.types';

interface Props {
  onExportPdf: () => void;
  onExportExcel: (filters: ReportFilters) => Promise<void>;
  filters: ReportFilters;
}

/**
 * Export buttons: PDF (browser print) and Excel (exceljs).
 */
export function ReportExporter({ onExportPdf, onExportExcel, filters }: Props) {
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelError, setExcelError] = useState<string | null>(null);

  async function handleExcel(): Promise<void> {
    setExcelLoading(true);
    setExcelError(null);
    try {
      await onExportExcel(filters);
    } catch (err) {
      setExcelError(err instanceof Error ? err.message : 'Erro ao exportar');
    } finally {
      setExcelLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 no-print">
      <button
        onClick={onExportPdf}
        className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        title="Exportar como PDF usando impressão do navegador"
      >
        <span>📄</span>
        <span>PDF</span>
      </button>

      <button
        onClick={() => void handleExcel()}
        disabled={excelLoading}
        className="flex items-center gap-1.5 rounded-md border border-green-600 bg-green-50 px-3 py-1.5 text-sm text-green-700 hover:bg-green-100 transition-colors disabled:opacity-60"
        title="Exportar como Excel (.xlsx)"
      >
        <span>📊</span>
        <span>{excelLoading ? 'Exportando…' : 'Excel'}</span>
      </button>

      {excelError && (
        <span className="text-xs text-red-600">{excelError}</span>
      )}
    </div>
  );
}
