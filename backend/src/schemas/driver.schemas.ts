import { z } from 'zod';

export const pickupSchema = z.object({
  photoBase64: z.string().optional(),
});

export const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export const occurrenceSchema = z.object({
  description: z.string().min(1, 'description is required').max(1000),
  photoBase64: z.string().optional(),
});

const deliveryItemSchema = z.object({
  itemId: z.string().min(1),
  status: z.enum(['delivered', 'missing', 'partial']),
  deliveredQuantity: z.number().int().nonnegative(),
});

export const deliverSchema = z.object({
  items: z.array(deliveryItemSchema).min(1, 'items checklist is required'),
  notes: z.string().max(500).optional(),
  signatureBase64: z.string().min(1, 'signatureBase64 is required'),
  photoBase64: z.string().optional(),
});
