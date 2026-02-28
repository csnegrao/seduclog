import { useCallback, useState } from 'react';
import { authHeaders } from './useRequests';
import {
  SummaryReport,
  DeliveriesReport,
  StockReport,
  DriverPerformance,
  DivergenceRecord,
  ReportFilters,
} from '../types/reports.types';

const API_BASE = process.env.REACT_APP_API_BASE ?? 'http://localhost:3001';

async function handleResponse<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T & { message?: string };
  if (!res.ok) throw new Error((body as { message?: string }).message ?? 'Request failed');
  return body;
}

function buildQueryString(filters: ReportFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, v);
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export interface UseReportsResult {
  loading: boolean;
  error: string | null;
  summary: SummaryReport | null;
  deliveries: DeliveriesReport | null;
  stock: StockReport | null;
  performance: DriverPerformance[] | null;
  divergences: DivergenceRecord[] | null;
  fetchSummary: (filters?: ReportFilters) => Promise<void>;
  fetchDeliveries: (filters?: ReportFilters) => Promise<void>;
  fetchStock: (filters?: ReportFilters) => Promise<void>;
  fetchPerformance: (filters?: ReportFilters) => Promise<void>;
  fetchDivergences: (filters?: ReportFilters) => Promise<void>;
  fetchAll: (filters?: ReportFilters) => Promise<void>;
  exportExcel: (filters?: ReportFilters) => Promise<void>;
  exportPdf: () => void;
}

export function useReports(): UseReportsResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryReport | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveriesReport | null>(null);
  const [stock, setStock] = useState<StockReport | null>(null);
  const [performance, setPerformance] = useState<DriverPerformance[] | null>(null);
  const [divergences, setDivergences] = useState<DivergenceRecord[] | null>(null);

  const fetchSummary = useCallback(async (filters: ReportFilters = {}): Promise<void> => {
    const res = await fetch(
      `${API_BASE}/api/reports/summary${buildQueryString(filters)}`,
      { headers: authHeaders() },
    );
    const data = await handleResponse<{ summary: SummaryReport }>(res);
    setSummary(data.summary);
  }, []);

  const fetchDeliveries = useCallback(async (filters: ReportFilters = {}): Promise<void> => {
    const res = await fetch(
      `${API_BASE}/api/reports/deliveries${buildQueryString(filters)}`,
      { headers: authHeaders() },
    );
    const data = await handleResponse<{ deliveries: DeliveriesReport }>(res);
    setDeliveries(data.deliveries);
  }, []);

  const fetchStock = useCallback(async (filters: ReportFilters = {}): Promise<void> => {
    const res = await fetch(
      `${API_BASE}/api/reports/stock${buildQueryString(filters)}`,
      { headers: authHeaders() },
    );
    const data = await handleResponse<{ stock: StockReport }>(res);
    setStock(data.stock);
  }, []);

  const fetchPerformance = useCallback(async (filters: ReportFilters = {}): Promise<void> => {
    const res = await fetch(
      `${API_BASE}/api/reports/driver-performance${buildQueryString(filters)}`,
      { headers: authHeaders() },
    );
    const data = await handleResponse<{ performance: DriverPerformance[] }>(res);
    setPerformance(data.performance);
  }, []);

  const fetchDivergences = useCallback(async (filters: ReportFilters = {}): Promise<void> => {
    const res = await fetch(
      `${API_BASE}/api/reports/divergences${buildQueryString(filters)}`,
      { headers: authHeaders() },
    );
    const data = await handleResponse<{ divergences: DivergenceRecord[] }>(res);
    setDivergences(data.divergences);
  }, []);

  const fetchAll = useCallback(
    async (filters: ReportFilters = {}): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([
          fetchSummary(filters),
          fetchDeliveries(filters),
          fetchStock(filters),
          fetchPerformance(filters),
          fetchDivergences(filters),
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [fetchSummary, fetchDeliveries, fetchStock, fetchPerformance, fetchDivergences],
  );

  /**
   * Exports all currently loaded report data as an Excel file (.xlsx)
   * using ExcelJS in the browser.
   */
  const exportExcel = useCallback(
    async (filters: ReportFilters = {}): Promise<void> => {
      // Dynamically import exceljs to keep initial bundle small.
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Seduclog';
      workbook.created = new Date();

      // ── Sheet 1: Summary ────────────────────────────────────────────────────
      if (summary) {
        const ws = workbook.addWorksheet('Resumo');
        ws.addRow(['Status', 'Total']);
        Object.entries(summary.byStatus).forEach(([status, count]) => {
          ws.addRow([status, count]);
        });
        ws.addRow([]);
        ws.addRow(['Data', 'Entregas']);
        summary.dailyVolume.forEach(({ date, count }) => ws.addRow([date, count]));
      }

      // ── Sheet 2: Deliveries ─────────────────────────────────────────────────
      if (deliveries) {
        const ws = workbook.addWorksheet('Entregas');
        ws.addRow(['Total', deliveries.total]);
        ws.addRow(['Entregues', deliveries.deliveredCount]);
        ws.addRow(['Taxa no Prazo (%)', deliveries.onTimeRate]);
        ws.addRow(['Tempo Médio (min)', deliveries.avgDeliveryTimeMin]);
        ws.addRow([]);
        ws.addRow(['Escola', 'Total', 'Entregues', 'Em Trânsito']);
        deliveries.bySchool.forEach((s) =>
          ws.addRow([s.school, s.total, s.delivered, s.inTransit]),
        );
      }

      // ── Sheet 3: Stock ──────────────────────────────────────────────────────
      if (stock) {
        const ws = workbook.addWorksheet('Estoque');
        ws.addRow(['ID', 'Nome', 'Categoria', 'Unidade', 'Estoque', 'Mínimo', 'Crítico']);
        stock.products.forEach((p) =>
          ws.addRow([p.id, p.name, p.category, p.unit, p.stock, p.minStock, p.isCritical ? 'Sim' : 'Não']),
        );
        ws.addRow([]);
        ws.addRow(['Top Produtos Solicitados']);
        ws.addRow(['Produto', 'Total Solicitado']);
        stock.topProducts.forEach((t) => ws.addRow([t.productName, t.totalRequested]));
      }

      // ── Sheet 4: Driver Performance ─────────────────────────────────────────
      if (performance) {
        const ws = workbook.addWorksheet('Motoristas');
        ws.addRow(['Motorista', 'Total', 'Entregues', 'No Prazo (%)', 'Tempo Médio (min)', 'Ocorrências']);
        performance.forEach((p) =>
          ws.addRow([
            p.driverName,
            p.totalDeliveries,
            p.deliveredCount,
            p.onTimeRate,
            p.avgDeliveryTimeMin,
            p.occurrenceCount,
          ]),
        );
      }

      // ── Sheet 5: Divergences ─────────────────────────────────────────────────
      if (divergences) {
        const ws = workbook.addWorksheet('Divergências');
        ws.addRow(['Protocolo', 'Escola', 'Motorista', 'Entregue em', 'Produto', 'Qtd Aprovada', 'Tipo']);
        divergences.forEach((d) => {
          d.items.forEach((item) =>
            ws.addRow([
              d.requestProtocol,
              d.school,
              d.driverName,
              d.deliveredAt,
              item.productName,
              item.approvedQuantity,
              item.divergenceType,
            ]),
          );
        });
      }

      const filtersLabel =
        filters.startDate && filters.endDate
          ? `_${filters.startDate}_${filters.endDate}`
          : '';
      const filename = `seduclog_relatorio${filtersLabel}.xlsx`;

      // Trigger browser download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    [summary, deliveries, stock, performance, divergences],
  );

  /**
   * Opens the browser's print dialog for the dashboard content.
   * The page's print CSS hides the sidebar and action buttons, leaving
   * only the report cards and charts visible.
   *
   * NOTE: This function is browser-only and must not be called in SSR contexts.
   */
  const exportPdf = useCallback((): void => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }, []);

  return {
    loading,
    error,
    summary,
    deliveries,
    stock,
    performance,
    divergences,
    fetchSummary,
    fetchDeliveries,
    fetchStock,
    fetchPerformance,
    fetchDivergences,
    fetchAll,
    exportExcel,
    exportPdf,
  };
}
