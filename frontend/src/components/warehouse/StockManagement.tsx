import React, { useCallback, useEffect, useState } from 'react';
import { Product } from '../../types/request.types';
import { StockMovementPayload } from '../../types/warehouse.types';
import { useWarehouse } from '../../hooks/useWarehouse';

const CATEGORIES = ['Todas', 'Papelaria', 'Material Escolar', 'Materiais Gerais'];

interface StockMovementFormState {
  productId: string;
  quantity: string;
  invoiceRef: string;
  notes: string;
}

/**
 * Stock management screen for warehouse operators.
 *
 * Features:
 *  - Full product list with search and category filter
 *  - Low-stock products highlighted in red
 *  - Stock entry form (supplier delivery with invoice reference)
 *  - PDF generation for product list
 */
export function StockManagement() {
  const { products, loading, error, fetchStock, fetchStockAlerts, registerStockMovement } =
    useWarehouse();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [alerts, setAlerts] = useState<Product[]>([]);
  const [form, setForm] = useState<StockMovementFormState>({
    productId: '',
    quantity: '',
    invoiceRef: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    await fetchStock(search || undefined, category !== 'Todas' ? category : undefined);
    const a = await fetchStockAlerts();
    setAlerts(a);
  }, [fetchStock, fetchStockAlerts, search, category]);

  useEffect(() => {
    void load();
  }, [load]);

  const alertIds = new Set(alerts.map((a) => a.id));

  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productId || !form.quantity) {
      setFormError('Selecione um produto e informe a quantidade.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    setSuccessMsg(null);
    try {
      const payload: StockMovementPayload = {
        productId: form.productId,
        quantity: Number(form.quantity),
        invoiceRef: form.invoiceRef || undefined,
        notes: form.notes || undefined,
      };
      const movement = await registerStockMovement(payload);
      setSuccessMsg(
        `Entrada registrada. Estoque de "${movement.productName}" atualizado para ${movement.newStock}.`,
      );
      setForm({ productId: '', quantity: '', invoiceRef: '', notes: '' });
      void load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to register movement');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintPdf = () => {
    const rows = products
      .map(
        (p) =>
          `${p.name.padEnd(35)} | ${String(p.stock).padStart(6)} ${p.unit.padEnd(10)} | ${p.category}`,
      )
      .join('\n');

    const content = `RELATÓRIO DE ESTOQUE\nGerado em: ${new Date().toLocaleString('pt-BR')}\n\n${'Produto'.padEnd(35)} | ${'Qtd'.padStart(6)} ${'Un.'.padEnd(10)} | Categoria\n${'-'.repeat(70)}\n${rows}`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<pre style="font-family:monospace;padding:2rem;font-size:12px">${content}</pre>`);
      win.print();
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Gestão de Estoque</h2>
        <button
          onClick={handlePrintPdf}
          className="text-sm px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          🖨 PDF
        </button>
      </div>

      {/* Low-stock alert banner */}
      {alerts.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700 mb-2">
            ⚠️ {alerts.length} produto(s) abaixo do estoque mínimo
          </p>
          <ul className="flex flex-col gap-1">
            {alerts.map((a) => (
              <li key={a.id} className="text-xs text-red-600">
                <span className="font-medium">{a.name}</span>: {a.stock} {a.unit} (mín:{' '}
                {a.minStock})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Search + category filter */}
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar produto..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Product list */}
      {loading && (
        <p className="text-center text-sm text-gray-500 py-4">Carregando...</p>
      )}

      {!loading && error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Produto</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Estoque</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Mínimo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Un.</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Categoria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-sm">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const isAlert = alertIds.has(p.id);
                    return (
                      <tr key={p.id} className={isAlert ? 'bg-red-50' : undefined}>
                        <td className="px-4 py-2.5">
                          <span className={isAlert ? 'font-semibold text-red-700' : 'text-gray-900'}>
                            {p.name}
                            {isAlert && (
                              <span className="ml-2 text-xs rounded-full bg-red-100 text-red-600 px-1.5 py-0.5 border border-red-200">
                                baixo estoque
                              </span>
                            )}
                          </span>
                        </td>
                        <td
                          className={`px-4 py-2.5 text-right font-mono font-medium ${
                            isAlert ? 'text-red-700' : 'text-gray-900'
                          }`}
                        >
                          {p.stock}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-500 font-mono">
                          {p.minStock}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">{p.unit}</td>
                        <td className="px-4 py-2.5 text-gray-500">{p.category}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock entry form */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Registrar Entrada de Estoque</h3>

        {formError && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-red-700 text-sm mb-3">
            {formError}
          </div>
        )}

        {successMsg && (
          <div className="rounded-md bg-green-50 border border-green-200 p-3 text-green-700 text-sm mb-3">
            {successMsg}
          </div>
        )}

        <form onSubmit={(e) => void handleMovementSubmit(e)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="mvt-product" className="text-xs font-medium text-gray-600">
              Produto
            </label>
            <select
              id="mvt-product"
              value={form.productId}
              onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione um produto</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (estoque: {p.stock} {p.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="mvt-qty" className="text-xs font-medium text-gray-600">
                Quantidade
              </label>
              <input
                id="mvt-qty"
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                required
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="mvt-invoice" className="text-xs font-medium text-gray-600">
                NF / Referência
              </label>
              <input
                id="mvt-invoice"
                type="text"
                value={form.invoiceRef}
                onChange={(e) => setForm((f) => ({ ...f, invoiceRef: e.target.value }))}
                placeholder="NF-001"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="mvt-notes" className="text-xs font-medium text-gray-600">
              Observações
            </label>
            <input
              id="mvt-notes"
              type="text"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Entrega de fornecedor..."
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Registrando...' : '+ Registrar Entrada'}
          </button>
        </form>
      </div>
    </div>
  );
}
