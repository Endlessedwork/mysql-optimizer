import { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';

/**
 * Rate limiting plugin configuration
 */
export async function rateLimitPlugin(fastify: FastifyInstance) {
  await fastify.register(rateLimit, {
    global: false, // Don't apply globally, only to specific routes
    max: 100, // Default: 100 requests per window
    timeWindow: '15 minutes', // Default window
    cache: 10000, // Size of LRU cache for storing rate limit data
    allowList: ['127.0.0.1', '::1'], // Whitelist localhost
    redis: undefined, // Use in-memory storage (upgrade to Redis for production scale)
    skipOnError: false, // Don't skip rate limiting on errors
    errorResponseBuilder: (request, context) => {
      return {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Please try again later.`,
          retryAfter: context.ttl, // Time until rate limit resets (ms)
        },
      };
    },
  });

  fastify.log.info('Rate limit plugin registered');
}

/**
 * Strict rate limit config for login/auth endpoints
 * 5 attempts per 15 minutes per IP
 */
export const loginRateLimitConfig = {
  max: 5,
  timeWindow: '15 minutes',
  errorResponseBuilder: (request: any, context: any) => {
    return {
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT',
        message: 'Too many login attempts. Please try again in 15 minutes.',
        retryAfter: Math.ceil(context.ttl / 1000), // Convert to seconds
      },
    };
  },
};

/**
 * Moderate rate limit for general API endpoints
 * 100 requests per 15 minutes per IP
 */
export const apiRateLimitConfig = {
  max: 100,
  timeWindow: '15 minutes',
};
