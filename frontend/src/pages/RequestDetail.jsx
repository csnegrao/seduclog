import { useEffect, useState } from 'react';
import { useDeliveryTracking } from '../hooks/useDeliveryTracking';
import { fetchTracking } from '../services/trackingApi';
import TrackingMap from '../components/TrackingMap';
import StatusTimeline from '../components/StatusTimeline';
import ETADisplay from '../components/ETADisplay';
import NotificationPermission from '../components/NotificationPermission';
import './RequestDetail.css';

/**
 * RequestDetail page shows the full tracking screen for a delivery order.
 *
 * Props (in a real router setup these would come from URL params):
 * @param {{ deliveryOrderId: string, userId: string }} props
 */
export default function RequestDetail({ deliveryOrderId, userId }) {
  const { trackingState, isConnected } = useDeliveryTracking(deliveryOrderId);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [error, setError] = useState(null);

  // Load initial state from REST API, then let sockets take over
  useEffect(() => {
    if (!deliveryOrderId) return;
    fetchTracking(deliveryOrderId)
      .then(() => setInitialLoaded(true))
      .catch((err) => {
        setError(err.message);
        setInitialLoaded(true);
      });
  }, [deliveryOrderId]);

  const { status, driverLocation, eta, destination } = trackingState;

  return (
    <div className="request-detail">
      <NotificationPermission userId={userId} />

      <header className="request-detail__header">
        <h1 className="request-detail__title">Acompanhar Entrega</h1>
        <span className="request-detail__id">Pedido: {deliveryOrderId}</span>
      </header>

      {error && (
        <div className="request-detail__error" role="alert">
          {error}
        </div>
      )}

      <section className="request-detail__eta" aria-label="Tempo estimado">
        <ETADisplay eta={eta} isConnected={isConnected} />
      </section>

      <section className="request-detail__map" aria-label="Mapa de rastreamento">
        {initialLoaded ? (
          <TrackingMap destination={destination} driverLocation={driverLocation} />
        ) : (
          <div className="request-detail__map-loading" aria-busy="true">
            Carregando…
          </div>
        )}
      </section>

      <section className="request-detail__timeline" aria-label="Linha do tempo do status">
        <h2 className="request-detail__section-title">Status da Entrega</h2>
        <StatusTimeline status={status} />
      </section>
    </div>
  );
}
