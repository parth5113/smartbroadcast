/**
 * Custom NoSQL injection sanitizer compatible with Express 5.
 * express-mongo-sanitize tries to set req.query (read-only in Express 5), so we roll our own.
 */

const DANGEROUS_KEYS = /^\$/;

function sanitizeValue(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value !== null && typeof value === 'object') {
    const clean = {};
    for (const [key, val] of Object.entries(value)) {
      if (!DANGEROUS_KEYS.test(key)) {
        clean[key] = sanitizeValue(val);
      }
    }
    return clean;
  }
  return value;
}

const sanitize = () => (req, res, next) => {
  if (req.body) req.body = sanitizeValue(req.body);
  // req.query is read-only in Express 5, but Zod validation handles that
  next();
};

module.exports = { sanitize };
