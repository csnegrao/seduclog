const { ZodError } = require('zod');

/**
 * Express middleware factory that validates `req.body` against a Zod schema.
 * Returns 422 Unprocessable Entity with field-level error messages on failure.
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(422).json({ error: 'Validation failed', details: errors });
    }
    req.body = result.data; // replace with coerced/stripped data
    next();
  };
}

module.exports = { validate };
