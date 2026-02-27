import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

export default function MessageThread({ requestId }) {
  const { user } = useAuth();
  const { socket } = useSocket() || {};
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const canSend = user && (user.role === 'REQUESTER' || user.role === 'WAREHOUSE_OPERATOR');

  const fetchMessages = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/messages/${requestId}`);
      setMessages(data);
    } catch {
      // handle error silently
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Subscribe to real-time messages and join request room
  useEffect(() => {
    if (!socket) return;
    socket.emit('join:request', requestId);

    const handler = (msg) => {
      if (msg.requestId === requestId) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === msg.id);
          return exists ? prev : [...prev, msg];
        });
      }
    };
    socket.on('message:new', handler);

    return () => {
      socket.off('message:new', handler);
      socket.emit('leave:request', requestId);
    };
  }, [socket, requestId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!content.trim() || sending) return;
    setSending(true);
    try {
      await api.post(`/api/messages/${requestId}`, { content });
      setContent('');
    } catch {
      // handle error silently
    } finally {
      setSending(false);
    }
  }

  if (loading) return <p style={{ color: '#718096', padding: '16px' }}>Carregando mensagens…</p>;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '420px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        overflow: 'hidden',
        background: '#f9fafb',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 16px',
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          fontWeight: 'bold',
          fontSize: '0.9rem',
          color: '#2d3748',
        }}
      >
        💬 Mensagens
      </div>

      {/* Messages list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {messages.length === 0 && (
          <p style={{ color: '#a0aec0', textAlign: 'center', marginTop: '40px', fontSize: '0.875rem' }}>
            Nenhuma mensagem ainda. Inicie a conversa!
          </p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.senderId === user?.id || msg.sender?.id === user?.id;
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isOwn ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '70%',
                  padding: '8px 12px',
                  borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isOwn ? '#3182ce' : '#fff',
                  color: isOwn ? '#fff' : '#2d3748',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                }}
              >
                {msg.content}
              </div>
              <span style={{ fontSize: '0.7rem', color: '#a0aec0', marginTop: '2px' }}>
                {msg.sender?.name || 'Você'} ·{' '}
                {new Date(msg.createdAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {canSend ? (
        <form
          onSubmit={handleSend}
          style={{
            display: 'flex',
            gap: '8px',
            padding: '10px 12px',
            background: '#fff',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Digite uma mensagem…"
            disabled={sending}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #cbd5e0',
              borderRadius: '20px',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={!content.trim() || sending}
            style={{
              background: '#3182ce',
              color: '#fff',
              border: 'none',
              borderRadius: '20px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              opacity: !content.trim() || sending ? 0.6 : 1,
            }}
          >
            Enviar
          </button>
        </form>
      ) : (
        <div
          style={{
            padding: '10px 16px',
            background: '#fff',
            borderTop: '1px solid #e2e8f0',
            color: '#718096',
            fontSize: '0.8rem',
            textAlign: 'center',
          }}
        >
          Somente solicitantes e operadores podem enviar mensagens.
        </div>
      )}
    </div>
  );
}
