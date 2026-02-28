import { randomUUID } from 'crypto';
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { findMessagesByRequest, addMessage } from '../models/message.model';
import { findRequestById } from '../models/request.model';
import { findUserById } from '../models/user.model';
import { emitMessage } from '../utils/socket';
import { Message, SendMessageBody } from '../types';

// ─── GET /api/messages/:requestId ────────────────────────────────────────────

/**
 * Returns the full message thread for a request, oldest first.
 * Accessible to: requester (own request), warehouse_operator, manager, admin.
 */
export function getThreadHandler(req: AuthenticatedRequest, res: Response): void {
  const user = req.user!;
  const { requestId } = req.params;

  const materialRequest = findRequestById(requestId);
  if (!materialRequest) {
    res.status(404).json({ message: 'Request not found' });
    return;
  }

  // Requesters may only view threads for their own requests.
  if (user.role === 'requester' && materialRequest.requesterId !== user.userId) {
    res.status(403).json({ message: 'Access denied' });
    return;
  }

  const messages = findMessagesByRequest(requestId);
  res.status(200).json({ messages });
}

// ─── POST /api/messages/:requestId ───────────────────────────────────────────

/**
 * Sends a message in the request thread.
 * Allowed roles: requester (own request), warehouse_operator, manager, admin.
 * Emits "message:new" to all Socket.io clients in the request thread room.
 */
export function sendMessageHandler(req: AuthenticatedRequest, res: Response): void {
  const user = req.user!;
  const { requestId } = req.params;
  const body = req.body as SendMessageBody;

  if (!body.text || !body.text.trim()) {
    res.status(400).json({ message: 'text is required' });
    return;
  }

  const materialRequest = findRequestById(requestId);
  if (!materialRequest) {
    res.status(404).json({ message: 'Request not found' });
    return;
  }

  // Requesters may only send in threads for their own requests.
  if (user.role === 'requester' && materialRequest.requesterId !== user.userId) {
    res.status(403).json({ message: 'Access denied' });
    return;
  }

  const sender = findUserById(user.userId);
  const senderName = sender?.name ?? user.email;

  const message: Message = {
    id: randomUUID(),
    requestId,
    senderId: user.userId,
    senderName,
    senderRole: user.role,
    text: body.text.trim(),
    createdAt: new Date(),
  };

  const saved = addMessage(message);
  emitMessage(saved);

  res.status(201).json({ message: saved });
}
