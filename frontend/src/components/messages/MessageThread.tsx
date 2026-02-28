import React, { useEffect, useRef, useState } from 'react';
import { useMessages } from '../../hooks/useMessages';
import { Message } from '../../types/notifications.types';
import { UserRole } from '../../types/auth.types';

interface Props {
  requestId: string;
  currentUserId: string;
  currentUserRole: UserRole;
  /** If true, shows a small "unread messages" indicator dot on the tab/button. */
  unreadCount?: number;
}

/**
 * Chat-style message thread for a request.
 * Messages from the current user appear on the right; others on the left.
 * The input is disabled for roles that cannot send messages (e.g. driver).
 */
export function MessageThread({
  requestId,
  currentUserId,
  currentUserRole,
  unreadCount,
}: Props) {
  const { messages, loading, error, sendMessage } = useMessages(requestId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const canSend = ['requester', 'warehouse_operator', 'manager', 'admin'].includes(
    currentUserRole,
  );

  // Auto-scroll to the latest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setSendError(null);
    try {
      await sendMessage(requestId, trimmed);
      setText('');
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Erro ao enviar');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800">
          Mensagens do Pedido
          {typeof unreadCount === 'number' && unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-bold h-4 w-4">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </h3>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {loading && (
          <p className="text-center text-gray-400 text-xs py-4">Carregando…</p>
        )}
        {error && (
          <p className="text-center text-red-500 text-xs py-4">{error}</p>
        )}
        {!loading && messages.length === 0 && (
          <p className="text-center text-gray-400 text-xs py-8">
            Nenhuma mensagem ainda. Seja o primeiro a escrever!
          </p>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isSelf={msg.senderId === currentUserId}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {canSend ? (
        <form
          onSubmit={(e) => void handleSend(e)}
          className="flex items-end gap-2 px-4 py-3 bg-white border-t border-gray-200"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend(e as unknown as React.FormEvent);
              }
            }}
            placeholder="Digite uma mensagem… (Enter para enviar)"
            rows={2}
            className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {sending ? '…' : 'Enviar'}
          </button>
        </form>
      ) : (
        <div className="px-4 py-2 text-xs text-gray-400 bg-white border-t border-gray-200 text-center">
          Apenas o solicitante, almoxarifado, gestor e admin podem enviar mensagens.
        </div>
      )}

      {sendError && (
        <p className="px-4 pb-2 text-xs text-red-600 bg-white">{sendError}</p>
      )}
    </div>
  );
}

// ─── MessageBubble ─────────────────────────────────────────────────────────────

interface BubbleProps {
  message: Message;
  isSelf: boolean;
}

function MessageBubble({ message, isSelf }: BubbleProps) {
  const ROLE_LABELS: Partial<Record<UserRole, string>> = {
    requester: 'Solicitante',
    warehouse_operator: 'Almoxarifado',
    manager: 'Gestor',
    admin: 'Admin',
    driver: 'Motorista',
  };

  return (
    <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} gap-0.5`}>
      {/* Sender name */}
      <span className="text-[10px] text-gray-400 px-1">
        {isSelf ? 'Você' : `${message.senderName} · ${ROLE_LABELS[message.senderRole] ?? message.senderRole}`}
      </span>

      {/* Bubble */}
      <div
        className={`max-w-xs rounded-2xl px-4 py-2 text-sm leading-snug break-words ${
          isSelf
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
        }`}
      >
        {message.text}
      </div>

      {/* Timestamp */}
      <span className="text-[10px] text-gray-400 px-1">
        {new Date(message.createdAt).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
    </div>
  );
}
