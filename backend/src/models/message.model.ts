import { Message } from '../types';

// In-memory message store keyed by requestId — replace with a real database in production.
const threads: Map<string, Message[]> = new Map();

export function addMessage(message: Message): Message {
  const thread = threads.get(message.requestId) ?? [];
  thread.push(message);
  threads.set(message.requestId, thread);
  return message;
}

/**
 * Returns all messages for a request thread sorted by creation time ascending.
 */
export function findMessagesByRequest(requestId: string): Message[] {
  return [...(threads.get(requestId) ?? [])].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
}

/**
 * Returns the number of messages in a thread that were not sent by a
 * given user and were created after a given timestamp.
 * Used to compute the "unread" indicator on request list items.
 */
export function countUnreadMessages(requestId: string, userId: string, since: Date): number {
  return (threads.get(requestId) ?? []).filter(
    (m) => m.senderId !== userId && m.createdAt > since,
  ).length;
}
