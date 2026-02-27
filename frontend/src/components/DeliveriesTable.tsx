import { useState } from 'react';
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import * as XLSX from 'xlsx';
import type { Divergence } from '../types';

interface DeliveryRow {
  request_id: number;
  school_name: string;
  driver_name: string | null;
  delivered_at: string;
  status: string;
  divergences: Divergence[];
}

interface Props {
  deliveries: DeliveryRow[];
  divergences: Divergence[];
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Aberto',
  in_transit: 'Em Trânsito',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  open: '#3b82f6',
  in_transit: '#f97316',
  delivered: '#22c55e',
  cancelled: '#ef4444',
};

const pdfStyles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, fontFamily: 'Helvetica' },
  title: { fontSize: 16, marginBottom: 12, fontFamily: 'Helvetica-Bold' },
  table: { width: '100%' },
  headerRow: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: 6 },
  row: { flexDirection: 'row', padding: 5, borderBottom: '1px solid #e5e7eb' },
  cell: { flex: 1, fontSize: 9 },
  bold: { fontFamily: 'Helvetica-Bold' },
});

function buildPDF(deliveries: DeliveryRow[]) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.title}>Relatório de Entregas — Seduclog</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.headerRow}>
            <Text style={[pdfStyles.cell, pdfStyles.bold]}>ID</Text>
            <Text style={[pdfStyles.cell, pdfStyles.bold]}>Escola</Text>
            <Text style={[pdfStyles.cell, pdfStyles.bold]}>Motorista</Text>
            <Text style={[pdfStyles.cell, pdfStyles.bold]}>Data</Text>
            <Text style={[pdfStyles.cell, pdfStyles.bold]}>Status</Text>
          </View>
          {deliveries.map((d) => (
            <View key={d.request_id} style={pdfStyles.row}>
              <Text style={pdfStyles.cell}>{d.request_id}</Text>
              <Text style={pdfStyles.cell}>{d.school_name}</Text>
              <Text style={pdfStyles.cell}>{d.driver_name || '—'}</Text>
              <Text style={pdfStyles.cell}>{d.delivered_at ? d.delivered_at.substring(0, 10) : '—'}</Text>
              <Text style={pdfStyles.cell}>{STATUS_LABELS[d.status] || d.status}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export default function DeliveriesTable({ deliveries, divergences }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const divMap = divergences.reduce<Record<number, Divergence[]>>((acc, d) => {
    if (!acc[d.request_id]) acc[d.request_id] = [];
    acc[d.request_id].push(d);
    return acc;
  }, {});

  function toggleRow(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function exportPDF() {
    const blob = await pdf(buildPDF(deliveries)).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'entregas.pdf';
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportExcel() {
    const rows = deliveries.map((d) => ({
      ID: d.request_id,
      Escola: d.school_name,
      Motorista: d.driver_name || '—',
      'Data Entrega': d.delivered_at ? d.delivered_at.substring(0, 10) : '—',
      Status: STATUS_LABELS[d.status] || d.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Entregas');
    XLSX.writeFile(wb, 'entregas.xlsx');
  }

  return (
    <div className="table-card">
      <div className="table-header">
        <h3 className="chart-title" style={{ margin: 0 }}>Entregas Recentes</h3>
        <div className="export-btns">
          <button className="btn-export" onClick={exportPDF}>📄 PDF</button>
          <button className="btn-export btn-excel" onClick={exportExcel}>📊 Excel</button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>ID</th>
              <th>Escola</th>
              <th>Motorista</th>
              <th>Data</th>
              <th>Status</th>
              <th>Divergências</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.length === 0 ? (
              <tr><td colSpan={7} className="no-data-cell">Sem entregas no período</td></tr>
            ) : (
              deliveries.map((row) => {
                const rowDivs = divMap[row.request_id] || [];
                const isExpanded = expanded.has(row.request_id);
                return (
                  <>
                    <tr
                      key={row.request_id}
                      className={`table-row ${rowDivs.length > 0 ? 'has-divergence' : ''}`}
                      onClick={() => rowDivs.length > 0 && toggleRow(row.request_id)}
                    >
                      <td className="expand-cell">
                        {rowDivs.length > 0 ? (isExpanded ? '▼' : '▶') : ''}
                      </td>
                      <td>#{row.request_id}</td>
                      <td>{row.school_name}</td>
                      <td>{row.driver_name || '—'}</td>
                      <td>{row.delivered_at ? row.delivered_at.substring(0, 10) : '—'}</td>
                      <td>
                        <span
                          className="status-badge"
                          style={{
                            background: `${STATUS_COLORS[row.status]}20`,
                            color: STATUS_COLORS[row.status],
                            border: `1px solid ${STATUS_COLORS[row.status]}40`,
                          }}
                        >
                          {STATUS_LABELS[row.status] || row.status}
                        </span>
                      </td>
                      <td>
                        {rowDivs.length > 0 ? (
                          <span className="divergence-badge">{rowDivs.length} item(s)</span>
                        ) : '—'}
                      </td>
                    </tr>
                    {isExpanded && rowDivs.length > 0 && (
                      <tr key={`exp-${row.request_id}`} className="expanded-row">
                        <td colSpan={7}>
                          <div className="divergence-detail">
                            <strong>Divergências:</strong>
                            <table className="div-table">
                              <thead>
                                <tr>
                                  <th>Produto</th>
                                  <th>Solicitado</th>
                                  <th>Entregue</th>
                                  <th>Faltante</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rowDivs.map((d, i) => (
                                  <tr key={i}>
                                    <td>{d.product_name}</td>
                                    <td>{d.quantity_requested}</td>
                                    <td>{d.quantity_delivered ?? 0}</td>
                                    <td className="missing">{d.missing_quantity}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
