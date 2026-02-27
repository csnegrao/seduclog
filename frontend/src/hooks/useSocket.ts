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
