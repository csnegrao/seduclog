import { useCallback, useEffect, useState } from 'react';
import { authHeaders } from './useRequests';
import { Message } from '../types/notifications.types';
import { getSocket } from '../utils/socket';

const API_BASE = process.env.REACT_APP_API_BASE ?? 'http://localhost:3001';

async function handleResponse<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T & { message?: string };
  if (!res.ok) throw new Error((body as { message?: string }).message ?? 'Request failed');
  return body;
}

export interface UseMessagesResult {
  messages: Message[];
  loading: boolean;
  error: string | null;
  fetchMessages: (requestId: string) => Promise<void>;
  sendMessage: (requestId: string, text: string) => Promise<void>;
}

/**
 * Fetches and manages the message thread for a specific request.
 * Subscribes to "message:new" Socket.io events for real-time updates.
 *
 * @param requestId - The request whose thread to load. Pass null to skip.
 */
export function useMessages(requestId: string | null): UseMessagesResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Join/leave the message thread room when requestId changes.
  useEffect(() => {
    if (!requestId) return;

    const socket = getSocket();

    const joinRoom = () => socket.emit('join:messages', requestId);

    if (socket.connected) joinRoom();
    socket.on('connect', joinRoom);

    return () => {
      socket.off('connect', joinRoom);
      socket.emit('leave:messages', requestId);
    };
  }, [requestId]);

  // Real-time new messages.
  useEffect(() => {
    const socket = getSocket();

    const handleNew = (msg: Message) => {
      // Only add if it belongs to the current thread.
      if (msg.requestId === requestId) {
        setMessages((prev) => {
          // Avoid duplicates (e.g., sender's own echoed message).
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    socket.on('message:new', handleNew);
    return () => {
      socket.off('message:new', handleNew);
    };
  }, [requestId]);

  const fetchMessages = useCallback(async (reqId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/messages/${reqId}`, {
        headers: authHeaders(),
      });
      const data = await handleResponse<{ messages: Message[] }>(res);
      setMessages(data.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (reqId: string, text: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/api/messages/${reqId}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ text }),
    });
    const data = await handleResponse<{ message: Message }>(res);
    // Optimistically add the sent message if not already present via socket.
    setMessages((prev) => {
      if (prev.some((m) => m.id === data.message.id)) return prev;
      return [...prev, data.message];
    });
  }, []);

  // Fetch thread on mount/requestId change.
  useEffect(() => {
    if (requestId) {
      void fetchMessages(requestId);
    } else {
      setMessages([]);
    }
  }, [requestId, fetchMessages]);

  return { messages, loading, error, fetchMessages, sendMessage };
}
