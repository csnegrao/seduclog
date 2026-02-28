import { z } from 'zod';

const requestItemSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  requestedQuantity: z.number().int().positive('requestedQuantity must be a positive integer'),
});

export const createRequestSchema = z.object({
  school: z.string().min(1, 'school is required').max(200),
  desiredDate: z.string().min(1, 'desiredDate is required'),
  justification: z.string().min(1, 'justification is required').max(1000),
  items: z.array(requestItemSchema).min(1, 'At least one item is required'),
});

const approveItemSchema = z.object({
  itemId: z.string().min(1),
  approvedQuantity: z.number().int().nonnegative('approvedQuantity must be non-negative'),
});

export const approveRequestSchema = z.object({
  items: z.array(approveItemSchema).optional(),
  notes: z.string().max(500).optional(),
});

export const cancelRequestSchema = z.object({
  notes: z.string().max(500).optional(),
});
