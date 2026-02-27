import { useEffect, useState, useCallback } from 'react';
import { getSocket, joinDeliveryAsRequester } from '../services/socket';

const DEFAULT_STATE = {
  status: 'approved',
  driverLocation: null,
  eta: null,
  destination: null,
};

/**
 * Custom hook that manages real-time tracking state for a delivery order.
 * Connects to the Socket.io room for the given deliveryOrderId and listens
 * for driver location and status updates.
 *
 * @param {string|null} deliveryOrderId
 * @returns {{ trackingState: Object, isConnected: boolean }}
 */
export function useDeliveryTracking(deliveryOrderId) {
  const [trackingState, setTrackingState] = useState(DEFAULT_STATE);
  const [isConnected, setIsConnected] = useState(false);

  const handleDeliveryUpdated = useCallback((data) => {
    setTrackingState((prev) => ({ ...prev, ...data }));
  }, []);

  const handleDriverLocation = useCallback(({ driverLocation, eta }) => {
    setTrackingState((prev) => ({ ...prev, driverLocation, eta }));
  }, []);

  const handleDeliveryStatus = useCallback(({ status }) => {
    setTrackingState((prev) => ({ ...prev, status }));
  }, []);

  useEffect(() => {
    if (!deliveryOrderId) return;

    const socket = getSocket();

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('delivery:updated', handleDeliveryUpdated);
    socket.on('driver:location', handleDriverLocation);
    socket.on('delivery:status', handleDeliveryStatus);

    if (socket.connected) setIsConnected(true);

    joinDeliveryAsRequester(deliveryOrderId);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('delivery:updated', handleDeliveryUpdated);
      socket.off('driver:location', handleDriverLocation);
      socket.off('delivery:status', handleDeliveryStatus);
    };
  }, [deliveryOrderId, handleDeliveryUpdated, handleDriverLocation, handleDeliveryStatus]);

  return { trackingState, isConnected };
}
