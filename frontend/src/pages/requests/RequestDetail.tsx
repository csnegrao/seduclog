import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Send, XCircle, MapPin, Package } from 'lucide-react';
import { requestsApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import type { MaterialRequest, RequestStatus } from '../../types';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<RequestStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  APPROVED: 'bg-blue-100 text-blue-800 border-blue-200',
  IN_PROGRESS: 'bg-purple-100 text-purple-800 border-purple-200',
  IN_TRANSIT: 'bg-orange-100 text-orange-800 border-orange-200',
  DELIVERED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200',
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  IN_PROGRESS: 'Em Andamento',
  IN_TRANSIT: 'Em Trânsito',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

const HISTORY_ICONS: Record<RequestStatus, string> = {
  PENDING: '🕐',
  APPROVED: '✅',
  IN_PROGRESS: '🔄',
  IN_TRANSIT: '🚚',
  DELIVERED: '📦',
  CANCELLED: '❌',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { socket } = useSocket();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [msgBody, setMsgBody] = useState('');
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: req, isLoading } = useQuery<MaterialRequest>({
    queryKey: ['request', id],
    queryFn: () => requestsApi.get(id!).then((r) => r.data),
    enabled: !!id,
    refetchInterval: 30_000, // poll every 30s as fallback
  });

  // Real-time updates via Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (data: { requestId: string; status: RequestStatus }) => {
      if (data.requestId === id) {
        qc.invalidateQueries({ queryKey: ['request', id] });
        qc.invalidateQueries({ queryKey: ['requests'] });
      }
    };

    const handleLocation = (data: { requestId: string; lat: number; lng: number }) => {
      if (data.requestId === id) {
        setDriverPos({ lat: data.lat, lng: data.lng });
      }
    };

    const handleMessage = (data: { requestId: string }) => {
      if (data.requestId === id) {
        qc.invalidateQueries({ queryKey: ['request', id] });
      }
    };

    socket.on('request:updated', handleUpdate);
    socket.on('driver:location', handleLocation);
    socket.on('request:message', handleMessage);

    return () => {
      socket.off('request:updated', handleUpdate);
      socket.off('driver:location', handleLocation);
      socket.off('request:message', handleMessage);
    };
  }, [socket, id, qc]);

  // Scroll messages to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [req?.messages?.length]);

  // Set driver position from request data
  useEffect(() => {
    if (req?.driverLat && req?.driverLng) {
      setDriverPos({ lat: req.driverLat, lng: req.driverLng });
    }
  }, [req?.driverLat, req?.driverLng]);

  const cancelMutation = useMutation({
    mutationFn: () => requestsApi.cancel(id!, 'Cancelado pelo solicitante.'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests'] });
      navigate('/requests');
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: () => requestsApi.addMessage(id!, msgBody),
    onSuccess: () => {
      setMsgBody('');
      qc.invalidateQueries({ queryKey: ['request', id] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!req) {
    return (
      <div className="card text-center py-16 text-gray-400">
        Requisição não encontrada.{' '}
        <Link to="/requests" className="text-blue-600 underline">
          Voltar
        </Link>
      </div>
    );
  }

  const canCancel =
    req.status === 'PENDING' &&
    (user?.role === 'ADMIN' || user?.id === req.requesterId);

  const showMap =
    (req.status === 'IN_TRANSIT' || req.status === 'DELIVERED') && driverPos;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Back + header */}
      <div className="flex items-start gap-4">
        <Link
          to="/requests"
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 mt-0.5 shrink-0"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-gray-500">{req.protocol}</span>
            <span className={`badge border ${STATUS_COLORS[req.status]}`}>
              {STATUS_LABELS[req.status]}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            Criado em {format(new Date(req.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        {canCancel && (
          <button
            onClick={() => confirm('Cancelar esta requisição?') && cancelMutation.mutate()}
            className="btn-danger py-1.5 text-xs shrink-0"
            disabled={cancelMutation.isPending}
          >
            <XCircle size={14} /> Cancelar
          </button>
        )}
      </div>

      {/* ── Items ──────────────────────────────────────────────────────────── */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Package size={16} className="text-blue-600" />
          Itens Solicitados
        </h2>
        <div className="divide-y divide-gray-100">
          {req.items.map((item) => (
            <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {item.material?.name ?? item.materialId}
                </p>
                {item.notes && (
                  <p className="text-xs text-gray-400 mt-0.5 italic">{item.notes}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm text-gray-700">
                  {item.approvedQty !== undefined ? (
                    <>
                      <span className="font-semibold text-blue-700">{item.approvedQty}</span>
                      <span className="text-gray-400">/{item.requestedQty}</span>
                    </>
                  ) : (
                    <span className="font-semibold">{item.requestedQty}</span>
                  )}{' '}
                  <span className="text-gray-400">{item.material?.unit}</span>
                </p>
                {item.approvedQty !== undefined && item.approvedQty !== item.requestedQty && (
                  <p className="text-xs text-amber-600">Quantidade ajustada</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Info ───────────────────────────────────────────────────────────── */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-gray-900">Detalhes</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500 text-xs uppercase font-medium mb-0.5">Data Desejada</p>
            <p className="text-gray-800">
              {format(new Date(req.desiredDate), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase font-medium mb-0.5">Solicitante</p>
            <p className="text-gray-800">{req.requester?.name}</p>
            {req.requester?.school && (
              <p className="text-xs text-gray-400">{req.requester.school}</p>
            )}
          </div>
        </div>
        <div>
          <p className="text-gray-500 text-xs uppercase font-medium mb-0.5">Justificativa</p>
          <p className="text-gray-700 text-sm leading-relaxed">{req.justification}</p>
        </div>
        {req.notes && (
          <div>
            <p className="text-gray-500 text-xs uppercase font-medium mb-0.5">Observações</p>
            <p className="text-gray-600 text-sm italic">{req.notes}</p>
          </div>
        )}
      </div>

      {/* ── Map (driver location) ─────────────────────────────────────────── */}
      {showMap && (
        <div className="card overflow-hidden p-0">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <MapPin size={16} className="text-orange-500" />
            <span className="font-semibold text-gray-900 text-sm">
              Localização do Motorista em Tempo Real
            </span>
            <span className="ml-auto flex items-center gap-1 text-xs text-green-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Ao vivo
            </span>
          </div>
          <GoogleMapEmbed lat={driverPos.lat} lng={driverPos.lng} />
        </div>
      )}

      {/* ── History ───────────────────────────────────────────────────────── */}
      {req.history && req.history.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3">Histórico</h2>
          <ol className="relative border-l border-gray-200 ml-2 space-y-4">
            {req.history.map((entry) => (
              <li key={entry.id} className="ml-5">
                <div className="absolute -left-2.5 w-5 h-5 rounded-full bg-white border-2 border-blue-300 flex items-center justify-center text-xs">
                  {HISTORY_ICONS[entry.status]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {STATUS_LABELS[entry.status]}
                  </p>
                  {entry.notes && (
                    <p className="text-xs text-gray-500 mt-0.5">{entry.notes}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {entry.user?.name} •{' '}
                    {format(new Date(entry.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── Message Thread ────────────────────────────────────────────────── */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-3">Mensagens</h2>

        <div className="space-y-3 max-h-80 overflow-y-auto mb-4 pr-1">
          {(!req.messages || req.messages.length === 0) && (
            <p className="text-center text-gray-400 text-sm py-4">
              Nenhuma mensagem ainda.
            </p>
          )}
          {req.messages?.map((msg) => {
            const isOwn = msg.senderId === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isOwn ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {msg.sender?.name?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    isOwn
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                  }`}
                >
                  {!isOwn && (
                    <p className="text-xs font-semibold text-gray-500 mb-0.5">
                      {msg.sender?.name}
                    </p>
                  )}
                  <p className="leading-relaxed">{msg.body}</p>
                  <p
                    className={`text-xs mt-1 ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}
                  >
                    {format(new Date(msg.createdAt), 'HH:mm')}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        {req.status !== 'CANCELLED' && req.status !== 'DELIVERED' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (msgBody.trim()) sendMessageMutation.mutate();
            }}
            className="flex gap-2"
          >
            <input
              className="input flex-1"
              placeholder="Escreva uma mensagem..."
              value={msgBody}
              onChange={(e) => setMsgBody(e.target.value)}
              disabled={sendMessageMutation.isPending}
            />
            <button
              type="submit"
              disabled={!msgBody.trim() || sendMessageMutation.isPending}
              className="btn-primary px-3 py-2.5"
            >
              <Send size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Google Maps Embed component ─────────────────────────────────────────────

function GoogleMapEmbed({ lat, lng }: { lat: number; lng: number }) {
  // Use Google Maps embed API — no API key required for basic embed
  const query = encodeURIComponent(`${lat},${lng}`);
  const src = `https://maps.google.com/maps?q=${query}&z=15&output=embed`;

  return (
    <div className="w-full h-64">
      <iframe
        title="Driver Location"
        src={src}
        className="w-full h-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
}
