import { randomUUID } from 'crypto';
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import {
  createRequest as dbCreate,
  findRequestById,
  findAllRequests,
  saveRequest,
  generateProtocol,
  RequestFilters,
} from '../models/request.model';
import {
  findProductById,
  decrementStock,
  incrementStock,
} from '../models/product.model';
import { findUserById } from '../models/user.model';
import { emitRequestUpdated } from '../utils/socket';
import {
  MaterialRequest,
  RequestItem,
  RequestHistoryEntry,
  RequestStatus,
  CreateRequestBody,
  ApproveRequestBody,
} from '../types';

// ─── POST /api/requests ───────────────────────────────────────────────────────

/**
 * Creates a new material request.
 * Only the REQUESTER role is allowed (enforced by the route-level `authorize` middleware).
 */
export function createRequestHandler(req: AuthenticatedRequest, res: Response): void {
  const user = req.user!;
  const body = req.body as CreateRequestBody;

  if (!body.school || !body.desiredDate || !body.justification || !body.items?.length) {
    res.status(400).json({
      message: 'school, desiredDate, justification, and items are required',
    });
    return;
  }

  // Validate items and check stock availability.
  const items: RequestItem[] = [];
  for (const raw of body.items) {
    if (!raw.productId || !raw.requestedQuantity || raw.requestedQuantity <= 0) {
      res.status(400).json({
        message: 'Each item must have a productId and a positive requestedQuantity',
      });
      return;
    }

    const product = findProductById(raw.productId);
    if (!product) {
      res.status(400).json({ message: `Product "${raw.productId}" not found` });
      return;
    }

    if (product.stock < raw.requestedQuantity) {
      res.status(422).json({
        message: `Insufficient stock for "${product.name}". Available: ${product.stock}`,
      });
      return;
    }

    items.push({
      id: randomUUID(),
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      requestedQuantity: raw.requestedQuantity,
    });
  }

  const requester = findUserById(user.userId);
  const requesterName = requester?.name ?? user.email;
  const now = new Date();

  const historyEntry: RequestHistoryEntry = {
    id: randomUUID(),
    status: 'pending',
    changedBy: user.userId,
    changedByName: requesterName,
    timestamp: now,
  };

  const newRequest: MaterialRequest = {
    id: randomUUID(),
    protocol: generateProtocol(),
    requesterId: user.userId,
    requesterName,
    school: body.school,
    status: 'pending',
    items,
    desiredDate: new Date(body.desiredDate),
    justification: body.justification,
    history: [historyEntry],
    createdAt: now,
    updatedAt: now,
  };

  const saved = dbCreate(newRequest);
  emitRequestUpdated(saved);

  res.status(201).json({ request: saved });
}

// ─── GET /api/requests ────────────────────────────────────────────────────────

const VALID_STATUSES = new Set<RequestStatus>([
  'pending',
  'approved',
  'in_progress',
  'in_transit',
  'delivered',
  'cancelled',
]);

/** Lists requests with optional filters: status, school, from, to, requesterId. */
export function listRequestsHandler(req: AuthenticatedRequest, res: Response): void {
  const user = req.user!;
  const { status, school, from, to, requesterId } = req.query as Record<
    string,
    string | undefined
  >;

  if (status && !VALID_STATUSES.has(status as RequestStatus)) {
    res.status(400).json({ message: `Invalid status value: "${status}"` });
    return;
  }

  const filters: RequestFilters = {};
  if (status) filters.status = status as RequestStatus;
  if (school) filters.school = school;

  if (from) {
    const fromDate = new Date(from);
    if (isNaN(fromDate.getTime())) {
      res.status(400).json({ message: 'Invalid "from" date' });
      return;
    }
    filters.from = fromDate;
  }

  if (to) {
    const toDate = new Date(to);
    if (isNaN(toDate.getTime())) {
      res.status(400).json({ message: 'Invalid "to" date' });
      return;
    }
    filters.to = toDate;
  }

  // Requesters can only see their own requests.
  if (user.role === 'requester') {
    filters.requesterId = user.userId;
  } else if (requesterId) {
    filters.requesterId = requesterId;
  }

  res.status(200).json({ requests: findAllRequests(filters) });
}

// ─── GET /api/requests/:id ────────────────────────────────────────────────────

/** Returns full request detail including items and history. */
export function getRequestHandler(req: AuthenticatedRequest, res: Response): void {
  const user = req.user!;
  const { id } = req.params;

  const request = findRequestById(id);
  if (!request) {
    res.status(404).json({ message: 'Request not found' });
    return;
  }

  // Requesters can only see their own requests.
  if (user.role === 'requester' && request.requesterId !== user.userId) {
    res.status(403).json({ message: 'Access denied' });
    return;
  }

  res.status(200).json({ request });
}

// ─── PATCH /api/requests/:id/approve ─────────────────────────────────────────

/**
 * WAREHOUSE_OPERATOR approves the request, optionally adjusting quantities.
 * Deducts approved quantities from stock.
 */
export function approveRequestHandler(req: AuthenticatedRequest, res: Response): void {
  const user = req.user!;
  const { id } = req.params;
  const body = req.body as ApproveRequestBody;

  const request = findRequestById(id);
  if (!request) {
    res.status(404).json({ message: 'Request not found' });
    return;
  }

  if (request.status !== 'pending') {
    res.status(409).json({
      message: `Cannot approve a request with status "${request.status}"`,
    });
    return;
  }

  // Build the approved-quantity map from the body (if provided).
  const approvalMap = new Map<string, number>(
    (body.items ?? []).map((a) => [a.itemId, a.approvedQuantity]),
  );

  // Resolve approved quantities (fall back to requestedQuantity when not specified).
  const updatedItems: RequestItem[] = request.items.map((item) => ({
    ...item,
    approvedQuantity: approvalMap.has(item.id)
      ? approvalMap.get(item.id)!
      : item.requestedQuantity,
  }));

  // Deduct stock — roll back all prior decrements if any item fails.
  const decremented: Array<{ productId: string; quantity: number }> = [];
  for (const item of updatedItems) {
    const qty = item.approvedQuantity!;
    if (!decrementStock(item.productId, qty)) {
      for (const { productId, quantity } of decremented) {
        incrementStock(productId, quantity);
      }
      res.status(422).json({
        message: `Insufficient stock to approve item "${item.productName}"`,
      });
      return;
    }
    decremented.push({ productId: item.productId, quantity: qty });
  }

  const operator = findUserById(user.userId);
  const operatorName = operator?.name ?? user.email;
  const now = new Date();

  const historyEntry: RequestHistoryEntry = {
    id: randomUUID(),
    status: 'approved',
    changedBy: user.userId,
    changedByName: operatorName,
    notes: body.notes,
    timestamp: now,
  };

  const updated: MaterialRequest = {
    ...request,
    items: updatedItems,
    status: 'approved',
    history: [...request.history, historyEntry],
    updatedAt: now,
  };

  const saved = saveRequest(updated);
  emitRequestUpdated(saved);

  res.status(200).json({ request: saved });
}

// ─── PATCH /api/requests/:id/cancel ──────────────────────────────────────────

/** Requester (or admin/warehouse_operator) cancels a pending request. */
export function cancelRequestHandler(req: AuthenticatedRequest, res: Response): void {
  const user = req.user!;
  const { id } = req.params;
  const { notes } = req.body as { notes?: string };

  const request = findRequestById(id);
  if (!request) {
    res.status(404).json({ message: 'Request not found' });
    return;
  }

  // Requesters can only cancel their own requests.
  if (user.role === 'requester' && request.requesterId !== user.userId) {
    res.status(403).json({ message: 'Access denied' });
    return;
  }

  if (request.status !== 'pending') {
    res.status(409).json({
      message: `Cannot cancel a request with status "${request.status}"`,
    });
    return;
  }

  const canceller = findUserById(user.userId);
  const cancellerName = canceller?.name ?? user.email;
  const now = new Date();

  const historyEntry: RequestHistoryEntry = {
    id: randomUUID(),
    status: 'cancelled',
    changedBy: user.userId,
    changedByName: cancellerName,
    notes,
    timestamp: now,
  };

  const updated: MaterialRequest = {
    ...request,
    status: 'cancelled',
    history: [...request.history, historyEntry],
    updatedAt: now,
  };

  const saved = saveRequest(updated);
  emitRequestUpdated(saved);

  res.status(200).json({ request: saved });
}
