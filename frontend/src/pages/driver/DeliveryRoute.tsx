import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveriesApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useSocketEvent } from '../../hooks/useSocket';
import SignaturePad from 'signature_pad';
import {
  MapPin, Navigation, CheckCircle, Package,
  PenLine, RefreshCw, Wifi, WifiOff,
} from 'lucide-react';
import { queueOfflineAction, syncPendingActions } from '../../services/indexedDB';
import type { Delivery, DeliveryStatus } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_STEPS: { key: DeliveryStatus; label: string; icon: React.ReactNode }[] = [
  { key: 'PENDING', label: 'Aguardando', icon: <Package size={16} /> },
  { key: 'EN_ROUTE', label: 'A Caminho', icon: <Navigation size={16} /> },
  { key: 'ARRIVED', label: 'Chegou', icon: <MapPin size={16} /> },
  { key: 'DELIVERED', label: 'Entregue', icon: <CheckCircle size={16} /> },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  EN_ROUTE: 'bg-blue-100 text-blue-700',
  ARRIVED: 'bg-orange-100 text-orange-700',
  DELIVERED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';

function MapView({ delivery }: { delivery: Delivery }) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!GOOGLE_MAPS_KEY || !mapRef.current || !delivery.destinationLat) return;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}`;
    script.async = true;
    script.onload = () => {
      if (!mapRef.current) return;
      // @ts-expect-error google maps global
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 13,
        center: { lat: delivery.destinationLat!, lng: delivery.destinationLng! },
      });
      // @ts-expect-error google maps global
      new window.google.maps.Marker({
        position: { lat: delivery.destinationLat!, lng: delivery.destinationLng! },
        map,
        title: 'Destino',
      });
      if (delivery.currentLat && delivery.currentLng) {
        // @ts-expect-error google maps global
        new window.google.maps.Marker({
          position: { lat: delivery.currentLat, lng: delivery.currentLng },
          map,
          // @ts-expect-error google maps global
          icon: { url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' },
          title: 'Motorista',
        });
      }
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [delivery]);

  if (!GOOGLE_MAPS_KEY) {
    return (
      <div className="h-48 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm">
        <MapPin size={20} className="mr-2" />
        {delivery.destination || 'Mapa indisponível (configure VITE_GOOGLE_MAPS_KEY)'}
      </div>
    );
  }

  return <div ref={mapRef} className="h-48 rounded-xl overflow-hidden" />;
}

function SignatureCapture({
  onSave,
  onCancel,
}: {
  onSave: (data: string, name: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [recipientName, setRecipientName] = useState('');

  useEffect(() => {
    if (canvasRef.current) {
      padRef.current = new SignaturePad(canvasRef.current, {
        backgroundColor: 'rgb(255,255,255)',
      });
    }
  }, []);

  const clear = () => padRef.current?.clear();

  const save = () => {
    if (!padRef.current || padRef.current.isEmpty()) {
      alert('Por favor, assine antes de confirmar.');
      return;
    }
    onSave(padRef.current.toDataURL(), recipientName);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Nome do Recebedor</label>
        <input
          className="input"
          placeholder="Nome completo..."
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Assinatura Digital</label>
        <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            width={480}
            height={200}
            className="w-full touch-none"
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">Assine acima com o dedo ou mouse</p>
      </div>
      <div className="flex gap-3">
        <button type="button" className="btn-secondary flex-1" onClick={clear}>
          <RefreshCw size={14} /> Limpar
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>
        <button type="button" className="btn-success flex-1" onClick={save}>
          <PenLine size={14} /> Confirmar Entrega
        </button>
      </div>
    </div>
  );
}

export default function DeliveryRoute() {
  const { user, token } = useAuth();
  const qc = useQueryClient();
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onOnline = () => { setIsOnline(true); syncPendingActions(); };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ['deliveries'],
    queryFn: () => deliveriesApi.list().then((r) => r.data),
  });

  const driverDeliveries = deliveries.filter((d) => d.driverId === user?.id);

  useSocketEvent<{ deliveryId: string; status: string }>('delivery:updated', useCallback(() => {
    qc.invalidateQueries({ queryKey: ['deliveries'] });
  }, [qc]));

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string; lat?: number; lng?: number }) => {
      if (!isOnline) {
        await queueOfflineAction({
          url: `/api/deliveries/${id}/status`,
          method: 'PATCH',
          body: { status },
          token: token || '',
        });
        return;
      }
      // Get current GPS location
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      ).catch(() => null);

      return deliveriesApi.updateStatus(id, status, position
        ? { lat: position.coords.latitude, lng: position.coords.longitude }
        : undefined
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deliveries'] }),
  });

  const signatureMutation = useMutation({
    mutationFn: ({ id, data, name }: { id: string; data: string; name: string }) =>
      deliveriesApi.saveSignature(id, data, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deliveries'] });
      setShowSignature(false);
      setSelectedDelivery(null);
    },
  });

  const getNextStatus = (current: DeliveryStatus): DeliveryStatus | null => {
    const map: Partial<Record<DeliveryStatus, DeliveryStatus>> = {
      PENDING: 'EN_ROUTE',
      EN_ROUTE: 'ARRIVED',
      ARRIVED: 'DELIVERED',
    };
    return map[current] ?? null;
  };

  const getNextLabel = (status: DeliveryStatus) => {
    const map: Partial<Record<DeliveryStatus, string>> = {
      PENDING: 'Iniciar Rota',
      EN_ROUTE: 'Cheguei ao Destino',
      ARRIVED: 'Confirmar Entrega',
    };
    return map[status] ?? '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minhas Entregas</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie e atualize suas rotas</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${isOnline ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {!isOnline && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          ⚠️ Você está offline. As atualizações serão sincronizadas automaticamente quando a conexão for restaurada.
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Carregando...</div>
      ) : driverDeliveries.length === 0 ? (
        <div className="card text-center py-12">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Nenhuma entrega atribuída a você</p>
        </div>
      ) : (
        <div className="space-y-4">
          {driverDeliveries.map((delivery) => (
            <div key={delivery.id} className="card space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    Entrega #{delivery.id.slice(-6).toUpperCase()}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">{delivery.destination || 'Endereço não informado'}</p>
                  {delivery.createdAt && (
                    <p className="text-xs text-gray-400">
                      {format(new Date(delivery.createdAt), "dd MMM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </div>
                <span className={`badge ${STATUS_COLORS[delivery.status]}`}>
                  {STATUS_STEPS.find((s) => s.key === delivery.status)?.label || delivery.status}
                </span>
              </div>

              {/* Progress steps */}
              <div className="flex items-center gap-1">
                {STATUS_STEPS.map((step, i) => {
                  const steps = ['PENDING', 'EN_ROUTE', 'ARRIVED', 'DELIVERED'];
                  const currentIdx = steps.indexOf(delivery.status);
                  const isActive = i <= currentIdx;
                  return (
                    <React.Fragment key={step.key}>
                      <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                        {step.icon}
                        <span className="hidden sm:inline">{step.label}</span>
                      </div>
                      {i < STATUS_STEPS.length - 1 && (
                        <div className={`flex-1 h-0.5 ${isActive && i < currentIdx ? 'bg-blue-400' : 'bg-gray-200'}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Items */}
              {delivery.pickingOrder?.request?.items && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Itens</p>
                  <div className="flex flex-wrap gap-2">
                    {delivery.pickingOrder.request.items.map((item) => (
                      <span key={item.id} className="badge bg-gray-100 text-gray-600">
                        {item.material?.name} × {item.quantity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Map */}
              <MapView delivery={delivery} />

              {/* Actions */}
              {delivery.status !== 'DELIVERED' && delivery.status !== 'FAILED' && (
                <div className="flex gap-3">
                  {getNextStatus(delivery.status) === 'DELIVERED' ? (
                    <button
                      className="btn-success flex-1"
                      onClick={() => { setSelectedDelivery(delivery); setShowSignature(true); }}
                    >
                      <PenLine size={16} /> {getNextLabel(delivery.status)}
                    </button>
                  ) : getNextStatus(delivery.status) && (
                    <button
                      className="btn-primary flex-1"
                      disabled={updateStatusMutation.isPending}
                      onClick={() => updateStatusMutation.mutate({
                        id: delivery.id,
                        status: getNextStatus(delivery.status)!,
                      })}
                    >
                      <Navigation size={16} /> {getNextLabel(delivery.status)}
                    </button>
                  )}
                </div>
              )}

              {delivery.status === 'DELIVERED' && (
                <div className="p-3 bg-green-50 rounded-xl text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle size={16} />
                  Entregue para {delivery.recipientName || 'destinatário'}
                  {delivery.deliveredAt && (
                    <span className="ml-auto text-xs text-green-600">
                      {format(new Date(delivery.deliveredAt), "HH:mm", { locale: ptBR })}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Signature Modal */}
      {showSignature && selectedDelivery && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Confirmar Entrega</h3>
              <p className="text-sm text-gray-500 mt-1">Colete a assinatura do recebedor</p>
            </div>
            <div className="p-6">
              <SignatureCapture
                onSave={(data, name) =>
                  signatureMutation.mutate({ id: selectedDelivery.id, data, name })
                }
                onCancel={() => { setShowSignature(false); setSelectedDelivery(null); }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
