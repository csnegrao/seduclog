import React, { useEffect, useState } from 'react';
import { DeliveryOrder, DeliveryOrderStatus } from '../../types/warehouse.types';
import { useDriver } from '../../hooks/useDriver';
import { ConnectionStatus } from './ConnectionStatus';

const MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const STATUS_LABELS: Record<DeliveryOrderStatus, string> = {
  created: 'Criado',
  picking: 'Separação',
  ready: 'Pronto',
  in_transit: 'Em Rota',
  delivered: 'Entregue',
};

const STATUS_COLORS: Record<DeliveryOrderStatus, string> = {
  created: 'bg-gray-100 text-gray-700',
  picking: 'bg-yellow-100 text-yellow-800',
  ready: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
};

interface Props {
  onSelectOrder?: (order: DeliveryOrder) => void;
}

/**
 * Driver home screen: shows all orders assigned to the authenticated driver,
 * with a static map thumbnail for each active order and connection status.
 */
export function DriverHome({ onSelectOrder }: Props) {
  const { orders, loading, error, online, pendingCount, fetchOrders, syncPending } = useDriver();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders, refreshKey]);

  const activeOrders = orders.filter((o) => o.status !== 'delivered');
  const completedOrders = orders.filter((o) => o.status === 'delivered');

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const getMapThumbnailUrl = (route?: string): string | null => {
    if (!MAPS_KEY || !route) return null;
    const dest = encodeURIComponent(route);
    return (
      `https://maps.googleapis.com/maps/api/staticmap` +
      `?size=400x150&markers=color:red|${dest}&key=${MAPS_KEY}`
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
        <h2 className="text-lg font-semibold text-gray-900">Minhas Entregas</h2>
        <div className="flex items-center gap-2">
          <ConnectionStatus online={online} pendingCount={pendingCount} />
          {!online && pendingCount > 0 && (
            <button
              onClick={() => void syncPending()}
              className="text-xs text-blue-600 hover:underline"
            >
              Sincronizar
            </button>
          )}
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="text-sm text-blue-600 hover:underline"
          >
            ↺
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {loading && (
          <p className="text-center text-gray-500 py-8 text-sm">Carregando...</p>
        )}

        {!loading && error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <p className="text-center text-gray-400 py-12 text-sm">
            Nenhuma entrega atribuída.
          </p>
        )}

        {/* Active orders */}
        {activeOrders.length > 0 && (
          <section className="mb-6">
            <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2 tracking-wide">
              Ativas
            </h3>
            <ul className="flex flex-col gap-3">
              {activeOrders.map((order) => {
                const mapUrl = getMapThumbnailUrl(order.estimatedRoute);
                return (
                  <li key={order.id}>
                    <button
                      className="w-full text-left rounded-xl bg-white border border-gray-200 overflow-hidden shadow-sm hover:border-blue-300 transition-colors"
                      onClick={() => onSelectOrder?.(order)}
                    >
                      {/* Map thumbnail */}
                      {mapUrl ? (
                        <img
                          src={mapUrl}
                          alt="Mapa da rota"
                          className="w-full h-28 object-cover"
                        />
                      ) : (
                        <div className="w-full h-20 bg-gradient-to-r from-blue-50 to-indigo-100 flex items-center justify-center text-gray-400 text-sm">
                          🗺 {order.estimatedRoute ?? 'Rota não definida'}
                        </div>
                      )}

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="font-mono text-xs text-gray-400">
                            {order.requestProtocol}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status]}`}
                          >
                            {STATUS_LABELS[order.status]}
                          </span>
                        </div>
                        <p className="font-semibold text-gray-900">{order.school}</p>
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                          <span>🚐 {order.vehiclePlate}</span>
                          <span>{order.picklist.length} item(s)</span>
                          {order.eta !== undefined && (
                            <span className="text-blue-600 font-medium">
                              ETA: {order.eta} min
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Criado em {formatDate(order.createdAt)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Completed orders */}
        {completedOrders.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2 tracking-wide">
              Concluídas
            </h3>
            <ul className="flex flex-col gap-2">
              {completedOrders.map((order) => (
                <li
                  key={order.id}
                  className="rounded-xl bg-white border border-gray-200 px-4 py-3 opacity-60"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-xs text-gray-400">{order.requestProtocol}</p>
                      <p className="text-sm font-medium text-gray-700">{order.school}</p>
                    </div>
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                      Entregue
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
