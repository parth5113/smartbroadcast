const { z } = require('zod');

/**
 * Generic Zod validation middleware.
 * Validates req.body against the provided schema.
 */
const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    next(error);
  }
};

module.exports = { validate };
