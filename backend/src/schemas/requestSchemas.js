const { z } = require('zod');

const createRequestSchema = z.object({
  title: z.string().min(1, 'title is required').max(200),
  description: z.string().max(2000).optional().default(''),
});

const updateRequestStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'IN_TRANSIT', 'DELIVERED'], {
    errorMap: () => ({ message: 'status must be one of APPROVED, REJECTED, IN_TRANSIT, DELIVERED' }),
  }),
});

module.exports = { createRequestSchema, updateRequestStatusSchema };
