import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { MaterialRequest } from '../types/request.types';

const SOCKET_URL = process.env.REACT_APP_API_BASE ?? 'http://localhost:3001';

/**
 * Subscribes to real-time "request:updated" events emitted by the backend.
 *
 * @param onRequestUpdated - Callback invoked whenever a request status changes.
 *
 * @example
 * useSocket((updated) => {
 *   setRequests((prev) =>
 *     prev.map((r) => (r.id === updated.id ? updated : r)),
 *   );
 * });
 */
export function useSocket(onRequestUpdated: (request: MaterialRequest) => void): void {
  const cbRef = useRef(onRequestUpdated);
  cbRef.current = onRequestUpdated;

  useEffect(() => {
    const socket: Socket = io(SOCKET_URL, { transports: ['websocket'] });

    socket.on('request:updated', (data: MaterialRequest) => {
      cbRef.current(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);
}
