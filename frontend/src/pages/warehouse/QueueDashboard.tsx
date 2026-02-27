import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseApi } from '../../services/api';
import type { MaterialRequest, Priority } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ClipboardList, ChevronDown, ChevronUp, Truck } from 'lucide-react';
import AssignDriverModal from './AssignDriverModal';

function priorityClass(p: Priority) {
  const map: Record<Priority, string> = {
    URGENT: 'badge bg-red-100 text-red-700',
    HIGH: 'badge bg-orange-100 text-orange-700',
    NORMAL: 'badge bg-blue-100 text-blue-700',
    LOW: 'badge bg-gray-100 text-gray-600',
  };
  return map[p];
}

function priorityLabel(p: Priority) {
  const map: Record<Priority, string> = {
    URGENT: 'Urgente',
    HIGH: 'Alta',
    NORMAL: 'Normal',
    LOW: 'Baixa',
  };
  return map[p];
}

export default function QueueDashboard() {
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assignRequest, setAssignRequest] = useState<MaterialRequest | null>(null);

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['queue'],
    queryFn: () => warehouseApi.getQueue().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const createOrderMutation = useMutation({
    mutationFn: (data: { requestId: string; driverId?: string; vehicleId?: string; destination?: string; notes?: string }) =>
      warehouseApi.createOrder(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['queue'] });
      setAssignRequest(null);
    },
  });

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando fila...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fila de Pedidos</h1>
          <p className="text-sm text-gray-500 mt-1">{queue.length} pedido(s) aguardando separação</p>
        </div>
        <ClipboardList size={24} className="text-blue-500" />
      </div>

      {queue.length === 0 ? (
        <div className="card text-center py-16">
          <ClipboardList size={48} className="mx-auto text-gray-300 mb-3" />
          <h2 className="text-lg font-semibold text-gray-600">Nenhum pedido na fila</h2>
          <p className="text-sm text-gray-400 mt-1">Todos os pedidos foram processados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((req) => (
            <div key={req.id} className="card p-0 overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={priorityClass(req.priority)}>{priorityLabel(req.priority)}</span>
                    <span className="text-sm font-semibold text-gray-800 truncate">
                      {req.requester?.name}
                    </span>
                    {req.requester?.school && (
                      <span className="text-xs text-gray-500">· {req.requester.school}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    <span>{req.items.length} item(s)</span>
                    {req.desiredDate && (
                      <span>
                        Necessário até: {format(new Date(req.desiredDate), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    )}
                    <span>Criado: {format(new Date(req.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                  </div>
                  {req.destination && (
                    <p className="text-xs text-gray-500 mt-1">Destino: {req.destination}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setAssignRequest(req)}
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    <Truck size={14} />
                    Iniciar Ordem
                  </button>
                  <button
                    onClick={() => toggleExpand(req.id)}
                    className="btn-secondary text-xs py-1.5 px-2"
                  >
                    {expandedId === req.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Detail panel */}
              {expandedId === req.id && (
                <div className="border-t border-gray-100 px-4 pb-4">
                  {req.notes && (
                    <p className="text-xs text-gray-600 italic mt-3 mb-2">Obs: {req.notes}</p>
                  )}
                  <div className="table-container mt-2">
                    <table>
                      <thead>
                        <tr>
                          <th>Material</th>
                          <th>Qtd</th>
                          <th>Unidade</th>
                          <th>Estoque atual</th>
                        </tr>
                      </thead>
                      <tbody>
                        {req.items.map((item) => {
                          const stock = (item.material as { id: string; name: string; unit: string; currentStock?: number } | undefined)?.currentStock;
                          const insufficient = stock !== undefined && stock < item.quantity;
                          return (
                            <tr key={item.id}>
                              <td className="font-medium">{item.material?.name}</td>
                              <td>{item.quantity}</td>
                              <td>{item.material?.unit}</td>
                              <td className={insufficient ? 'text-red-600 font-semibold' : 'text-green-600'}>
                                {stock !== undefined ? stock : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {assignRequest && (
        <AssignDriverModal
          request={assignRequest}
          onClose={() => setAssignRequest(null)}
          onConfirm={(data) =>
            createOrderMutation.mutate({ requestId: assignRequest.id, ...data })
          }
          isLoading={createOrderMutation.isPending}
        />
      )}
    </div>
  );
}
