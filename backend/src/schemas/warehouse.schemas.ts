import { z } from 'zod';

export const createDeliveryOrderSchema = z.object({
  requestId: z.string().min(1, 'requestId is required'),
  driverId: z.string().min(1, 'driverId is required'),
  vehicleId: z.string().min(1, 'vehicleId is required'),
  estimatedRoute: z.string().max(500).optional(),
});

export const stockMovementSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  quantity: z.number().int().positive('quantity must be a positive integer'),
  invoiceRef: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

const reconcileCountSchema = z.object({
  productId: z.string().min(1),
  physicalCount: z.number().int().nonnegative('physicalCount must be non-negative'),
});

export const reconcileInventorySchema = z.object({
  counts: z.array(reconcileCountSchema).min(1, 'counts array is required'),
});
