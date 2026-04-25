const { rateLimit } = require('express-rate-limit');

// General API rate limiter: 100 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

// Auth routes: 5 requests per 15 minutes (login/register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later.' },
  skipSuccessfulRequests: true,
});

// Broadcast route: 10 requests per minute
const broadcastLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Broadcast rate limit exceeded. Please wait.' },
});

module.exports = { generalLimiter, authLimiter, broadcastLimiter };
