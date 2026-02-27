import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { XCircle, ChevronRight, Plus } from 'lucide-react';
import { requestsApi } from '../../services/api';
import type { RequestStatus, MaterialRequest } from '../../types';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_TABS: { label: string; value: RequestStatus | 'ALL' }[] = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Pendentes', value: 'PENDING' },
  { label: 'Aprovados', value: 'APPROVED' },
  { label: 'Em Andamento', value: 'IN_PROGRESS' },
  { label: 'Em Trânsito', value: 'IN_TRANSIT' },
  { label: 'Entregues', value: 'DELIVERED' },
  { label: 'Cancelados', value: 'CANCELLED' },
];

const STATUS_COLORS: Record<RequestStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  IN_TRANSIT: 'bg-orange-100 text-orange-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  IN_PROGRESS: 'Em Andamento',
  IN_TRANSIT: 'Em Trânsito',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function RequestList() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<RequestStatus | 'ALL'>('ALL');

  const { data: requests = [], isLoading } = useQuery<MaterialRequest[]>({
    queryKey: ['requests'],
    queryFn: () => requestsApi.list().then((r) => r.data),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => requestsApi.cancel(id, 'Cancelado pelo solicitante.'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requests'] }),
  });

  const filtered =
    activeTab === 'ALL' ? requests : requests.filter((r) => r.status === activeTab);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minhas Requisições</h1>
          <p className="text-sm text-gray-500 mt-0.5">Acompanhe o status de suas solicitações</p>
        </div>
        <Link to="/requests/new" className="btn-primary">
          <Plus size={16} /> Nova Requisição
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 no-scrollbar">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.value === 'ALL'
              ? requests.length
              : requests.filter((r) => r.status === tab.value).length;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === tab.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${
                    activeTab === tab.value ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-lg">Nenhuma requisição encontrada.</p>
          {activeTab === 'ALL' && (
            <Link to="/requests/new" className="btn-primary mt-4">
              <Plus size={16} /> Criar primeira requisição
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              onCancel={(id) => {
                if (confirm('Deseja cancelar esta requisição?')) {
                  cancelMutation.mutate(id);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({
  req,
  onCancel,
}: {
  req: MaterialRequest;
  onCancel: (id: string) => void;
}) {
  return (
    <Link
      to={`/requests/${req.id}`}
      className="card flex gap-4 items-start hover:shadow-md transition-shadow group"
    >
      {/* Status indicator */}
      <div
        className={`w-1 self-stretch rounded-full shrink-0 ${
          req.status === 'DELIVERED'
            ? 'bg-green-500'
            : req.status === 'CANCELLED'
            ? 'bg-gray-300'
            : req.status === 'IN_TRANSIT'
            ? 'bg-orange-500'
            : 'bg-blue-500'
        }`}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-semibold text-gray-500">{req.protocol}</span>
              <span className={`badge ${STATUS_COLORS[req.status]}`}>
                {STATUS_LABELS[req.status]}
              </span>
            </div>
            <p className="text-sm text-gray-700 mt-1 line-clamp-1">{req.justification}</p>
          </div>

          {req.status === 'PENDING' && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onCancel(req.id);
              }}
              className="btn-danger py-1 px-2.5 text-xs shrink-0"
            >
              <XCircle size={13} /> Cancelar
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center gap-3 text-xs text-gray-400 flex-wrap">
          <span>
            📅 Entrega desejada:{' '}
            {format(new Date(req.desiredDate), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
          </span>
          <span>·</span>
          <span>
            🗓 Criado em:{' '}
            {format(new Date(req.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>

        {/* Item summary */}
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          {req.items.slice(0, 3).map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600"
            >
              {item.material?.name ?? item.materialId}
              <span className="text-gray-400">×{item.requestedQty}</span>
            </span>
          ))}
          {req.items.length > 3 && (
            <span className="text-xs text-gray-400">+{req.items.length - 3} mais</span>
          )}
        </div>
      </div>

      <ChevronRight
        size={18}
        className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0 mt-1"
      />
    </Link>
  );
}
