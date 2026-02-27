import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseApi } from '../../services/api';
import type { Material, MovementType } from '../../types';
import { Package, AlertTriangle, Search, Printer, Plus, X } from 'lucide-react';

const MOVEMENT_LABELS: Record<MovementType, string> = {
  IN: 'Entrada',
  OUT: 'Saída',
  ADJUSTMENT: 'Ajuste',
  TRANSFER: 'Transferência',
};

interface MovementForm {
  materialId: string;
  type: MovementType;
  quantity: number;
  reason: string;
  invoiceRef: string;
  reference: string;
}

export default function StockManagement() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<MovementForm>({
    materialId: '',
    type: 'IN',
    quantity: 1,
    reason: '',
    invoiceRef: '',
    reference: '',
  });

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['stock'],
    queryFn: () => warehouseApi.getStock().then((r) => r.data),
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['stock-alerts'],
    queryFn: () => warehouseApi.getAlerts().then((r) => r.data),
  });

  const movementMutation = useMutation({
    mutationFn: (data: MovementForm) =>
      warehouseApi.createMovement({
        materialId: data.materialId,
        type: data.type,
        quantity: data.quantity,
        reason: data.reason || undefined,
        invoiceRef: data.invoiceRef || undefined,
        reference: data.reference || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['stock-alerts'] });
      setShowModal(false);
      setForm({ materialId: '', type: 'IN', quantity: 1, reason: '', invoiceRef: '', reference: '' });
    },
  });

  const categories = Array.from(new Set(materials.map((m) => m.category))).sort();

  const filtered = materials.filter((m) => {
    const matchSearch =
      search === '' ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.sku && m.sku.toLowerCase().includes(search.toLowerCase()));
    const matchCategory = categoryFilter === '' || m.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const isLow = (m: Material) => m.minStock > 0 && m.currentStock <= m.minStock;

  const handlePrint = () => window.print();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Estoque</h1>
          <p className="text-sm text-gray-500 mt-1">{materials.length} materiais cadastrados</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="btn-secondary print:hidden">
            <Printer size={16} />
            Exportar PDF
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary print:hidden">
            <Plus size={16} />
            Registrar Movimentação
          </button>
        </div>
      </div>

      {/* Alerts section */}
      {alerts.length > 0 && (
        <div className="card border-yellow-200 bg-yellow-50 print:hidden">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-yellow-600" />
            <h2 className="font-semibold text-yellow-800">{alerts.length} material(is) abaixo do estoque mínimo</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {alerts.map((m) => (
              <span key={m.id} className="badge bg-red-100 text-red-700">
                {m.name}: {m.currentStock}/{m.minStock} {m.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 print:hidden">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="input pl-9"
            placeholder="Buscar por nome ou SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-48"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-500">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <Package size={32} className="mb-2" />
            <p className="text-sm">Nenhum material encontrado</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>SKU</th>
                  <th>Categoria</th>
                  <th>Unidade</th>
                  <th>Estoque atual</th>
                  <th>Estoque mín.</th>
                  <th className="print:hidden">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className={isLow(m) ? 'bg-red-50' : ''}>
                    <td className="font-medium">
                      {m.name}
                      {isLow(m) && <AlertTriangle size={12} className="inline ml-1 text-red-500" />}
                    </td>
                    <td className="text-gray-500">{m.sku ?? '-'}</td>
                    <td>{m.category}</td>
                    <td>{m.unit}</td>
                    <td className={`font-semibold ${isLow(m) ? 'text-red-600' : 'text-gray-900'}`}>
                      {m.currentStock}
                    </td>
                    <td className="text-gray-500">{m.minStock}</td>
                    <td className="print:hidden">
                      <button
                        className="btn-secondary text-xs py-1 px-2"
                        onClick={() => {
                          setForm((prev) => ({ ...prev, materialId: m.id }));
                          setShowModal(true);
                        }}
                      >
                        Movimentar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Movement Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Registrar Movimentação</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <form
              className="p-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                movementMutation.mutate(form);
              }}
            >
              <div>
                <label className="label">Material</label>
                <select
                  className="input"
                  required
                  value={form.materialId}
                  onChange={(e) => setForm((p) => ({ ...p, materialId: e.target.value }))}
                >
                  <option value="">Selecionar material...</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (estoque: {m.currentStock} {m.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Tipo</label>
                <select
                  className="input"
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as MovementType }))}
                >
                  {(Object.keys(MOVEMENT_LABELS) as MovementType[]).map((t) => (
                    <option key={t} value={t}>{MOVEMENT_LABELS[t]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Quantidade</label>
                <input
                  type="number"
                  className="input"
                  required
                  min={form.type === 'ADJUSTMENT' ? undefined : 1}
                  value={form.quantity}
                  onChange={(e) => setForm((p) => ({ ...p, quantity: Number(e.target.value) }))}
                />
                {form.type === 'ADJUSTMENT' && (
                  <p className="text-xs text-gray-500 mt-1">Use valor negativo para reduzir estoque.</p>
                )}
              </div>

              <div>
                <label className="label">Nota Fiscal / Ref. Fornecedor</label>
                <input
                  type="text"
                  className="input"
                  value={form.invoiceRef}
                  onChange={(e) => setForm((p) => ({ ...p, invoiceRef: e.target.value }))}
                  placeholder="NF-001234..."
                />
              </div>

              <div>
                <label className="label">Referência interna</label>
                <input
                  type="text"
                  className="input"
                  value={form.reference}
                  onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))}
                  placeholder="Pedido, contrato..."
                />
              </div>

              <div>
                <label className="label">Motivo</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  value={form.reason}
                  onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="Descreva o motivo da movimentação..."
                />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={movementMutation.isPending}>
                  {movementMutation.isPending ? 'Salvando...' : 'Registrar'}
                </button>
              </div>
              {movementMutation.isError && (
                <p className="text-sm text-red-600 text-center">
                  Erro ao registrar movimentação. Verifique os dados.
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
