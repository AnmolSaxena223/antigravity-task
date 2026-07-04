import rateLimit from 'express-rate-limit';

/**
 * General API Rate Limiter
 * Limits requests to 100 per 15 minutes
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Authentication and OTP Rate Limiter
 * Limits requests to 5 per minute (to prevent brute forcing of OTPs / spamming SMS)
 */
export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in a minute.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
