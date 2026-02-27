import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCheck, Eye } from 'lucide-react';
import { requestsApi } from '../../services/api';
import type { MaterialRequest, RequestStatus } from '../../types';

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

export default function OperatorRequests() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<RequestStatus | 'ALL'>('PENDING');
  const [approving, setApproving] = useState<string | null>(null);

  const { data: requests = [], isLoading } = useQuery<MaterialRequest[]>({
    queryKey: ['operator-requests'],
    queryFn: () => requestsApi.list().then((r) => r.data),
    refetchInterval: 15_000,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      requestsApi.approve(id, { notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operator-requests'] });
      setApproving(null);
    },
  });

  const filtered =
    activeTab === 'ALL' ? requests : requests.filter((r) => r.status === activeTab);

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  const tabs: { label: string; value: RequestStatus | 'ALL' }[] = [
    { label: `Pendentes (${pendingCount})`, value: 'PENDING' },
    { label: 'Aprovados', value: 'APPROVED' },
    { label: 'Em Andamento', value: 'IN_PROGRESS' },
    { label: 'Todos', value: 'ALL' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gerenciar Requisições</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Analise e aprove as solicitações de materiais
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          Nenhuma requisição{activeTab !== 'ALL' ? ` ${STATUS_LABELS[activeTab as RequestStatus].toLowerCase()}` : ''} encontrada.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <div key={req.id} className="card space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-gray-500">
                      {req.protocol}
                    </span>
                    <span className={`badge ${STATUS_COLORS[req.status]}`}>
                      {STATUS_LABELS[req.status]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {req.requester?.name}
                    {req.requester?.school && (
                      <span className="text-gray-400"> — {req.requester.school}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Criado em{' '}
                    {format(new Date(req.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    {' · '}Entrega desejada:{' '}
                    {format(new Date(req.desiredDate), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Link
                    to={`/requests/${req.id}`}
                    className="btn-secondary py-1.5 text-xs"
                  >
                    <Eye size={13} /> Ver
                  </Link>
                  {req.status === 'PENDING' && (
                    <button
                      onClick={() => setApproving(approving === req.id ? null : req.id)}
                      className="btn-success py-1.5 text-xs"
                    >
                      <CheckCheck size={13} /> Aprovar
                    </button>
                  )}
                </div>
              </div>

              {/* Justification */}
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 line-clamp-2">
                {req.justification}
              </p>

              {/* Items */}
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">
                  Itens ({req.items.length})
                </p>
                <div className="space-y-1.5">
                  {req.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{item.material?.name}</span>
                      <span className="text-gray-500 font-medium shrink-0">
                        {item.approvedQty !== undefined ? (
                          <>
                            <span className="text-blue-700">{item.approvedQty}</span>
                            <span className="text-gray-400">/{item.requestedQty}</span>
                          </>
                        ) : (
                          item.requestedQty
                        )}{' '}
                        {item.material?.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Approve panel */}
              {approving === req.id && (
                <ApprovePanel
                  req={req}
                  onApprove={(notes) => approveMutation.mutate({ id: req.id, notes })}
                  onCancel={() => setApproving(null)}
                  loading={approveMutation.isPending}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Approve Panel ────────────────────────────────────────────────────────────

function ApprovePanel({
  onApprove,
  onCancel,
  loading,
}: {
  req: MaterialRequest;
  onApprove: (notes?: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [notes, setNotes] = useState('');

  return (
    <div className="border-t border-blue-100 pt-3 space-y-3 bg-blue-50 -mx-4 lg:-mx-6 px-4 lg:px-6 pb-4 rounded-b-xl">
      <p className="text-sm font-semibold text-blue-800">Confirmar Aprovação</p>
      <p className="text-xs text-blue-700">
        Ao aprovar, o estoque será deduzido automaticamente pelas quantidades solicitadas.
        Para ajustar quantidades, use a tela de detalhes da requisição.
      </p>
      <div>
        <label className="label text-xs text-blue-700">Observações (opcional)</label>
        <textarea
          className="input text-sm"
          rows={2}
          placeholder="Adicione uma observação para o solicitante..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onApprove(notes || undefined)}
          disabled={loading}
          className="btn-success py-2 text-sm flex-1"
        >
          {loading ? (
            <span className="flex items-center gap-2 justify-center">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Aprovando...
            </span>
          ) : (
            <>
              <CheckCheck size={15} /> Confirmar Aprovação
            </>
          )}
        </button>
        <button onClick={onCancel} className="btn-secondary py-2 text-sm">
          Cancelar
        </button>
      </div>
    </div>
  );
}
