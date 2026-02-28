import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requestsApi, ordersApi, deliveriesApi, usersApi } from '../../services/api';
import { ClipboardCheck, Truck, ChevronRight, X } from 'lucide-react';
import type { MaterialRequest, User } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  IN_PICKING: 'bg-purple-100 text-purple-700',
  READY: 'bg-teal-100 text-teal-700',
  DISPATCHED: 'bg-orange-100 text-orange-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  IN_PICKING: 'Em Separação',
  READY: 'Pronto',
  DISPATCHED: 'Despachado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

export default function OrderPreparation() {
  const qc = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<MaterialRequest | null>(null);
  const [dispatchModal, setDispatchModal] = useState<MaterialRequest | null>(null);
  const [driverId, setDriverId] = useState('');
  const [destination, setDestination] = useState('');

  const { data: requests = [] } = useQuery({
    queryKey: ['requests'],
    queryFn: () => requestsApi.list().then((r) => r.data),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data),
    select: (data: User[]) => data.filter((u) => u.role === 'DRIVER' && u.active),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => requestsApi.updateStatus(id, 'APPROVED'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requests'] }),
  });

  const startPickingMutation = useMutation({
    mutationFn: (requestId: string) => ordersApi.create({ requestId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requests'] }); setSelectedRequest(null); },
  });

  const dispatchMutation = useMutation({
    mutationFn: async (request: MaterialRequest) => {
      // Find the picking order for this request
      const order = request.pickingOrder;
      if (!order) throw new Error('No picking order');
      return deliveriesApi.create({
        pickingOrderId: order.id,
        driverId: driverId || undefined,
        destination,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests'] });
      setDispatchModal(null);
      setDriverId('');
      setDestination('');
    },
  });

  const markReady = useMutation({
    mutationFn: async (request: MaterialRequest) => {
      const order = request.pickingOrder;
      if (order) await ordersApi.updateStatus(order.id, 'COMPLETED');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requests'] }),
  });

  const pending = requests.filter((r) => r.status === 'PENDING');
  const approved = requests.filter((r) => r.status === 'APPROVED');
  const inPicking = requests.filter((r) => r.status === 'IN_PICKING');
  const ready = requests.filter((r) => r.status === 'READY');

  const RequestCard = ({ req }: { req: MaterialRequest }) => (
    <div className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedRequest(req)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`badge ${STATUS_COLORS[req.status]}`}>{STATUS_LABELS[req.status]}</span>
            {req.priority !== 'NORMAL' && (
              <span className={`badge ${req.priority === 'URGENT' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                {req.priority === 'URGENT' ? '🔴 Urgente' : '🟠 Alta'}
              </span>
            )}
          </div>
          <p className="font-medium text-gray-900 truncate">{req.requester?.school || req.requester?.name}</p>
          <p className="text-xs text-gray-400 mt-1">
            {format(new Date(req.createdAt), "dd MMM 'às' HH:mm", { locale: ptBR })}
          </p>
          <p className="text-xs text-gray-500 mt-1">{req.items.length} item(ns)</p>
        </div>
        <ChevronRight size={16} className="text-gray-300 mt-1 flex-shrink-0" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Separação de Pedidos</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie o fluxo de pedidos do almoxarifado</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Pending Column */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            Pendentes ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map((r) => <RequestCard key={r.id} req={r} />)}
          </div>
        </div>

        {/* Approved Column */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            Aprovados ({approved.length})
          </h3>
          <div className="space-y-3">
            {approved.map((r) => <RequestCard key={r.id} req={r} />)}
          </div>
        </div>

        {/* In Picking Column */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            Em Separação ({inPicking.length})
          </h3>
          <div className="space-y-3">
            {inPicking.map((r) => <RequestCard key={r.id} req={r} />)}
          </div>
        </div>

        {/* Ready Column */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400" />
            Pronto ({ready.length})
          </h3>
          <div className="space-y-3">
            {ready.map((r) => <RequestCard key={r.id} req={r} />)}
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-semibold">Pedido #{selectedRequest.id.slice(-6).toUpperCase()}</h3>
              <button onClick={() => setSelectedRequest(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-500">Solicitante</p><p className="font-medium">{selectedRequest.requester?.name}</p></div>
                <div><p className="text-gray-500">Escola</p><p className="font-medium">{selectedRequest.requester?.school || '—'}</p></div>
                <div><p className="text-gray-500">Prioridade</p><p className="font-medium">{selectedRequest.priority}</p></div>
                <div><p className="text-gray-500">Status</p><span className={`badge ${STATUS_COLORS[selectedRequest.status]}`}>{STATUS_LABELS[selectedRequest.status]}</span></div>
              </div>

              {selectedRequest.notes && (
                <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
                  <strong>Observações:</strong> {selectedRequest.notes}
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Itens Solicitados</h4>
                <div className="space-y-2">
                  {selectedRequest.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg">
                      <span>{item.material?.name}</span>
                      <span className="font-medium">{item.quantity} {item.material?.unit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                {selectedRequest.status === 'PENDING' && (
                  <button
                    className="btn-primary flex-1"
                    onClick={() => { approveMutation.mutate(selectedRequest.id); setSelectedRequest(null); }}
                  >
                    <ClipboardCheck size={16} /> Aprovar
                  </button>
                )}
                {selectedRequest.status === 'APPROVED' && (
                  <button
                    className="btn-primary flex-1"
                    onClick={() => { startPickingMutation.mutate(selectedRequest.id); }}
                  >
                    Iniciar Separação
                  </button>
                )}
                {selectedRequest.status === 'IN_PICKING' && (
                  <button
                    className="btn-success flex-1"
                    onClick={() => { markReady.mutate(selectedRequest); setSelectedRequest(null); }}
                  >
                    Marcar como Pronto
                  </button>
                )}
                {selectedRequest.status === 'READY' && (
                  <button
                    className="btn-primary flex-1"
                    onClick={() => { setDispatchModal(selectedRequest); setSelectedRequest(null); }}
                  >
                    <Truck size={16} /> Despachar
                  </button>
                )}
                <button
                  className="btn-danger"
                  onClick={() => { requestsApi.updateStatus(selectedRequest.id, 'CANCELLED'); qc.invalidateQueries({ queryKey: ['requests'] }); setSelectedRequest(null); }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch Modal */}
      {dispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold">Despachar Entrega</h3>
              <button onClick={() => setDispatchModal(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Motorista</label>
                <select className="input" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                  <option value="">Selecionar motorista...</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Destino</label>
                <input
                  className="input"
                  placeholder="Endereço de entrega..."
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button className="btn-secondary flex-1" onClick={() => setDispatchModal(null)}>Cancelar</button>
                <button
                  className="btn-primary flex-1"
                  onClick={() => dispatchMutation.mutate(dispatchModal)}
                  disabled={dispatchMutation.isPending}
                >
                  {dispatchMutation.isPending ? 'Despachando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
