const { z } = require('zod');

const createStockSchema = z.object({
  productName: z.string().min(1, 'productName is required').max(200),
  quantity: z.number().int().min(0, 'quantity must be >= 0').optional().default(0),
  minimumQuantity: z.number().int().min(0, 'minimumQuantity must be >= 0').optional().default(10),
});

const updateStockSchema = z
  .object({
    quantity: z.number().int().min(0, 'quantity must be >= 0').optional(),
    minimumQuantity: z.number().int().min(0, 'minimumQuantity must be >= 0').optional(),
  })
  .refine((data) => data.quantity !== undefined || data.minimumQuantity !== undefined, {
    message: 'At least one of quantity or minimumQuantity must be provided',
  });

module.exports = { createStockSchema, updateStockSchema };
