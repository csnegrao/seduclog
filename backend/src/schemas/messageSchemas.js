const { z } = require('zod');

const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message content is required')
    .max(5000, 'Message is too long')
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, { message: 'Message content cannot be empty' }),
});

module.exports = { sendMessageSchema };
