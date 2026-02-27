import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseApi } from '../../services/api';
import type { PickingOrder, ChecklistItem } from '../../types';
import { CheckCircle, Circle, Printer, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PickingScreen() {
  const qc = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<PickingOrder | null>(null);
  const [qtys, setQtys] = useState<Record<string, number>>({});

  // We get the queue to find orders in IN_PICKING state
  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['picking-orders'],
    queryFn: async () => {
      // Re-using warehouse queue but filtering for orders in picking
      const r = await warehouseApi.getQueue();
      return r.data;
    },
  });

  const startPickingMutation = useMutation({
    mutationFn: (id: string) => warehouseApi.startPicking(id),
    onSuccess: (res) => {
      setSelectedOrder(res.data);
      qc.invalidateQueries({ queryKey: ['picking-orders'] });
    },
  });

  const confirmItemMutation = useMutation({
    mutationFn: ({ orderId, itemId, qty }: { orderId: string; itemId: string; qty: number }) =>
      warehouseApi.confirmChecklistItem(orderId, itemId, qty),
    onSuccess: (res, vars) => {
      setSelectedOrder((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          checklistItems: prev.checklistItems?.map((ci) =>
            ci.id === vars.itemId ? { ...ci, ...res.data } : ci
          ),
        };
      });
    },
  });

  const confirmedCount = selectedOrder?.checklistItems?.filter((ci) => ci.confirmed).length ?? 0;
  const totalCount = selectedOrder?.checklistItems?.length ?? 0;
  const progress = totalCount > 0 ? Math.round((confirmedCount / totalCount) * 100) : 0;
  const allConfirmed = totalCount > 0 && confirmedCount === totalCount;

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Carregando...</div>;
  }

  if (selectedOrder) {
    const req = selectedOrder.request;
    return (
      <div className="space-y-4 print:space-y-2">
        {/* Print header */}
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-bold">Folha de Separação - SeducLog SEDUC</h1>
          <p className="text-sm">Ordem: {selectedOrder.id}</p>
          <p className="text-sm">Data: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
          {req && <p className="text-sm">Solicitante: {req.requester?.name} — {req.requester?.school}</p>}
        </div>

        <div className="flex items-center justify-between print:hidden">
          <div>
            <button onClick={() => setSelectedOrder(null)} className="text-sm text-blue-600 hover:underline mb-1 flex items-center gap-1">
              ← Voltar à lista
            </button>
            <h1 className="text-xl font-bold text-gray-900">Separação em andamento</h1>
            {req && (
              <p className="text-sm text-gray-500">
                {req.requester?.name} {req.requester?.school ? `— ${req.requester.school}` : ''}
              </p>
            )}
          </div>
          <button onClick={handlePrint} className="btn-secondary print:hidden">
            <Printer size={16} />
            Imprimir
          </button>
        </div>

        {/* Progress bar */}
        <div className="card print:hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progresso da separação</span>
            <span className="text-sm font-bold text-blue-600">{confirmedCount}/{totalCount} itens ({progress}%)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Checklist */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-3">Lista de Materiais</h2>
          <div className="space-y-3">
            {selectedOrder.checklistItems?.map((item: ChecklistItem) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  item.confirmed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                }`}
              >
                <div className="shrink-0">
                  {item.confirmed ? (
                    <CheckCircle size={22} className="text-green-500" />
                  ) : (
                    <Circle size={22} className="text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${item.confirmed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {item.material?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Necessário: {item.requiredQty} {item.material?.unit}
                    {item.confirmed && ` · Separado: ${item.confirmedQty}`}
                  </p>
                </div>
                {!item.confirmed && (
                  <div className="flex items-center gap-2 shrink-0 print:hidden">
                    <input
                      type="number"
                      min={0}
                      max={item.requiredQty}
                      defaultValue={item.requiredQty}
                      className="input w-20 text-center"
                      onChange={(e) =>
                        setQtys((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))
                      }
                    />
                    <button
                      className="btn-success text-xs py-1.5"
                      onClick={() =>
                        confirmItemMutation.mutate({
                          orderId: selectedOrder.id,
                          itemId: item.id,
                          qty: qtys[item.id] ?? item.requiredQty,
                        })
                      }
                      disabled={confirmItemMutation.isPending}
                    >
                      Confirmar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {allConfirmed && (
          <div className="card bg-green-50 border-green-200 print:hidden">
            <div className="flex items-center gap-3">
              <CheckCircle size={24} className="text-green-500" />
              <div>
                <p className="font-semibold text-green-800">Separação completa!</p>
                <p className="text-sm text-green-600">Todos os itens foram confirmados.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Picking list — show all requests in queue for operator to pick
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tela de Separação</h1>
        <p className="text-sm text-gray-500 mt-1">Selecione um pedido para iniciar a separação</p>
      </div>

      {queue.length === 0 ? (
        <div className="card text-center py-16">
          <CheckCircle size={48} className="mx-auto text-gray-300 mb-3" />
          <h2 className="text-lg font-semibold text-gray-600">Nenhuma ordem pendente</h2>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((req) => (
            <div key={req.id} className="card flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{req.requester?.name}</p>
                <p className="text-xs text-gray-500">{req.requester?.school} · {req.items.length} item(s)</p>
              </div>
              {req.pickingOrder ? (
                <button
                  className="btn-primary text-xs"
                  onClick={() => startPickingMutation.mutate(req.pickingOrder!.id)}
                  disabled={startPickingMutation.isPending}
                >
                  Retomar Separação
                  <ChevronRight size={14} />
                </button>
              ) : (
                <span className="text-xs text-gray-400 italic">Sem ordem criada</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
