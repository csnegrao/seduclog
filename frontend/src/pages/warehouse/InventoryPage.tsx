import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseApi } from '../../services/api';
import type { InventorySession, InventoryItem } from '../../types';
import { ClipboardList, Plus, CheckCircle, X, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function statusBadge(status: string) {
  const map: Record<string, string> = {
    OPEN: 'badge bg-blue-100 text-blue-700',
    IN_PROGRESS: 'badge bg-yellow-100 text-yellow-700',
    CLOSED: 'badge bg-green-100 text-green-700',
  };
  const labels: Record<string, string> = {
    OPEN: 'Aberto',
    IN_PROGRESS: 'Em andamento',
    CLOSED: 'Fechado',
  };
  return { cls: map[status] ?? 'badge bg-gray-100 text-gray-600', label: labels[status] ?? status };
}

export default function InventoryPage() {
  const qc = useQueryClient();
  const [activeSession, setActiveSession] = useState<InventorySession | null>(null);
  const [physicalQtys, setPhysicalQtys] = useState<Record<string, number>>({});
  const [showStartModal, setShowStartModal] = useState(false);
  const [startNotes, setStartNotes] = useState('');

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => warehouseApi.listInventory().then((r) => r.data),
  });

  const startMutation = useMutation({
    mutationFn: (notes: string) => warehouseApi.startInventory(notes || undefined),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      setActiveSession(res.data);
      // Pre-fill physical qtys with system qtys
      const initial: Record<string, number> = {};
      res.data.items.forEach((item) => {
        initial[item.id] = item.systemQty;
      });
      setPhysicalQtys(initial);
      setShowStartModal(false);
      setStartNotes('');
    },
  });

  const loadSessionMutation = useMutation({
    mutationFn: (id: string) => warehouseApi.getInventory(id),
    onSuccess: (res) => {
      setActiveSession(res.data);
      const initial: Record<string, number> = {};
      res.data.items.forEach((item) => {
        initial[item.id] = item.physicalQty ?? item.systemQty;
      });
      setPhysicalQtys(initial);
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: (session: InventorySession) => {
      const items = session.items.map((item) => ({
        itemId: item.id,
        physicalQty: physicalQtys[item.id] ?? item.systemQty,
      }));
      return warehouseApi.reconcileInventory(session.id, items);
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      setActiveSession(res.data);
    },
  });

  if (activeSession) {
    const isClosed = activeSession.status === 'CLOSED';
    const categorized = activeSession.items.reduce<Record<string, InventoryItem[]>>((acc, item) => {
      const cat = item.material?.category ?? 'Outros';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => setActiveSession(null)}
              className="text-sm text-blue-600 hover:underline mb-1"
            >
              ← Voltar ao histórico
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Contagem de Inventário</h1>
            <p className="text-sm text-gray-500 mt-1">
              Iniciado em {format(new Date(activeSession.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })} por {activeSession.operator?.name}
            </p>
          </div>
          {!isClosed && (
            <button
              className="btn-primary"
              onClick={() => reconcileMutation.mutate(activeSession)}
              disabled={reconcileMutation.isPending}
            >
              <CheckCircle size={16} />
              {reconcileMutation.isPending ? 'Processando...' : 'Concluir Inventário'}
            </button>
          )}
          {isClosed && (
            <span className="badge bg-green-100 text-green-700 text-sm px-3 py-1">Inventário Concluído</span>
          )}
        </div>

        {Object.entries(categorized).map(([category, items]) => (
          <div key={category} className="card">
            <h2 className="font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">{category}</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Un.</th>
                    <th>Qtd Sistema</th>
                    <th>Qtd Física</th>
                    <th>Ajuste</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: InventoryItem) => {
                    const physical = physicalQtys[item.id] ?? item.systemQty;
                    const adjustment = physical - item.systemQty;
                    return (
                      <tr key={item.id} className={item.reconciled ? 'opacity-60' : ''}>
                        <td className="font-medium">{item.material?.name}</td>
                        <td>{item.material?.unit}</td>
                        <td className="text-gray-600">{item.systemQty}</td>
                        <td>
                          {isClosed ? (
                            <span>{item.physicalQty ?? '-'}</span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              className="input w-24 text-center"
                              value={physical}
                              onChange={(e) =>
                                setPhysicalQtys((prev) => ({
                                  ...prev,
                                  [item.id]: Number(e.target.value),
                                }))
                              }
                              disabled={item.reconciled}
                            />
                          )}
                        </td>
                        <td>
                          <span
                            className={`font-semibold ${
                              adjustment > 0 ? 'text-green-600' : adjustment < 0 ? 'text-red-600' : 'text-gray-500'
                            }`}
                          >
                            {adjustment > 0 ? '+' : ''}{isClosed ? (item.adjustment ?? 0) : adjustment}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventário</h1>
          <p className="text-sm text-gray-500 mt-1">Histórico de sessões de inventário</p>
        </div>
        <button onClick={() => setShowStartModal(true)} className="btn-primary">
          <Plus size={16} />
          Novo Inventário
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32 text-gray-500">Carregando...</div>
      ) : sessions.length === 0 ? (
        <div className="card text-center py-16">
          <ClipboardList size={48} className="mx-auto text-gray-300 mb-3" />
          <h2 className="text-lg font-semibold text-gray-600">Nenhum inventário realizado</h2>
          <p className="text-sm text-gray-400 mt-1">Clique em "Novo Inventário" para iniciar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const badge = statusBadge(session.status);
            return (
              <div key={session.id} className="card flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={badge.cls}>{badge.label}</span>
                    <span className="text-sm font-medium text-gray-800">
                      {format(new Date(session.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Operador: {session.operator?.name}
                    {session.closedAt && ` · Concluído em ${format(new Date(session.closedAt), 'dd/MM/yyyy', { locale: ptBR })}`}
                    {(session as InventorySession & { _count?: { items: number } })._count?.items !== undefined &&
                      ` · ${(session as InventorySession & { _count?: { items: number } })._count!.items} itens`}
                  </p>
                </div>
                <button
                  className="btn-secondary text-xs"
                  onClick={() => loadSessionMutation.mutate(session.id)}
                >
                  Ver detalhes
                  <ChevronRight size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Start Inventory Modal */}
      {showStartModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Iniciar Novo Inventário</h2>
              <button onClick={() => setShowStartModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">
                Será criada uma sessão de inventário com todos os materiais ativos. Você poderá inserir as
                quantidades físicas e calcular os ajustes automaticamente.
              </p>
              <div>
                <label className="label">Observações (opcional)</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  value={startNotes}
                  onChange={(e) => setStartNotes(e.target.value)}
                  placeholder="Descrição do inventário..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowStartModal(false)}
                  className="btn-secondary flex-1 justify-center"
                >
                  Cancelar
                </button>
                <button
                  className="btn-primary flex-1 justify-center"
                  disabled={startMutation.isPending}
                  onClick={() => startMutation.mutate(startNotes)}
                >
                  {startMutation.isPending ? 'Criando...' : 'Iniciar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
