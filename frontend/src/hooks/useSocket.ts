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
import { useContext, useEffect } from 'react';
import { SocketContext } from '../contexts/SocketContext';

export function useSocket() {
  return useContext(SocketContext);
}

export function useSocketEvent<T>(event: string, handler: (data: T) => void) {
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler]);
}
