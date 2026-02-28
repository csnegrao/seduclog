import { z } from 'zod';

export const sendMessageSchema = z.object({
  text: z.string().trim().min(1, 'text is required').max(2000),
});
