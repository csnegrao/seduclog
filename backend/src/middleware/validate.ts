import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Express middleware factory that validates `req.body` against a Zod schema.
 * Returns HTTP 422 with a structured error list on failure.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      res.status(422).json({ message: 'Validation failed', errors });
      return;
    }
    // Replace body with the parsed (and potentially transformed) value.
    req.body = result.data;
    next();
  };
}
