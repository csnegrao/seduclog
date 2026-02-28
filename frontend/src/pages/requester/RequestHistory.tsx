import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requestsApi } from '../../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { XCircle } from 'lucide-react';
import type { RequestStatus, Priority } from '../../types';

const STATUS_COLORS: Record<RequestStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  IN_PICKING: 'bg-purple-100 text-purple-700',
  READY: 'bg-teal-100 text-teal-700',
  DISPATCHED: 'bg-orange-100 text-orange-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-400',
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  IN_PICKING: 'Em Separação',
  READY: 'Pronto p/ Envio',
  DISPATCHED: 'A Caminho',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: 'bg-gray-100 text-gray-500',
  NORMAL: 'bg-blue-50 text-blue-600',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

export default function RequestHistory() {
  const qc = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requests'],
    queryFn: () => requestsApi.list().then((r) => r.data),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => requestsApi.updateStatus(id, 'CANCELLED'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requests'] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Histórico de Pedidos</h1>
        <p className="text-sm text-gray-500 mt-1">Acompanhe o status de suas solicitações</p>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Carregando...</div>
      ) : requests.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          Nenhum pedido encontrado. <a href="/requests" className="text-blue-600 underline">Fazer novo pedido</a>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="card space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`badge ${STATUS_COLORS[req.status]}`}>
                      {STATUS_LABELS[req.status]}
                    </span>
                    <span className={`badge ${PRIORITY_COLORS[req.priority]}`}>
                      {req.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {format(new Date(req.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  {req.destination && (
                    <p className="text-sm text-gray-600 mt-1">📍 {req.destination}</p>
                  )}
                </div>

                {req.status === 'PENDING' && (
                  <button
                    onClick={() => {
                      if (confirm('Cancelar este pedido?')) cancelMutation.mutate(req.id);
                    }}
                    className="btn-danger py-1.5 text-xs"
                  >
                    <XCircle size={14} /> Cancelar
                  </button>
                )}
              </div>

              {/* Items */}
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Itens</p>
                <div className="space-y-1.5">
                  {req.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-700">{item.material?.name}</span>
                      <span className="text-gray-500 font-medium">
                        {item.fulfilledQty > 0
                          ? `${item.fulfilledQty}/${item.quantity} ${item.material?.unit}`
                          : `${item.quantity} ${item.material?.unit}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {req.notes && (
                <p className="text-sm text-gray-500 italic border-t border-gray-100 pt-3">
                  Obs: {req.notes}
                </p>
              )}

              {/* Delivery info */}
              {req.pickingOrder?.delivery && (
                <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-800 border-t border-gray-100 pt-3">
                  {req.pickingOrder.delivery.status === 'DELIVERED'
                    ? `✅ Entregue${req.pickingOrder.delivery.recipientName ? ` para ${req.pickingOrder.delivery.recipientName}` : ''}`
                    : `🚚 Em trânsito — ${req.pickingOrder.delivery.destination || ''}`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
