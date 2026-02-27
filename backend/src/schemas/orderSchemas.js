const { z } = require('zod');

const createOrderSchema = z.object({
  requestId: z.string().min(1, 'requestId is required'),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'DISPATCHED', 'DELIVERED'], {
    errorMap: () => ({ message: 'status must be one of PENDING, DISPATCHED, DELIVERED' }),
  }),
  driverEta: z
    .string()
    .datetime({ message: 'driverEta must be a valid ISO 8601 datetime' })
    .optional(),
});

module.exports = { createOrderSchema, updateOrderStatusSchema };
