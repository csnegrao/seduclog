const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(1, 'name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  role: z
    .enum(['REQUESTER', 'WAREHOUSE_OPERATOR', 'DRIVER', 'ADMIN'])
    .optional()
    .default('REQUESTER'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'password is required'),
});

module.exports = { registerSchema, loginSchema };
