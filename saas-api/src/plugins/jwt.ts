import { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';

/**
 * JWT and Cookie plugin configuration
 */
export async function jwtPlugin(fastify: FastifyInstance) {
  // Register cookie plugin first (JWT plugin depends on it for cookie mode)
  await fastify.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET || process.env.JWT_SECRET || 'default-cookie-secret',
    parseOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    },
  });

  // Register JWT plugin
  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-chars',
    sign: {
      algorithm: 'HS256',
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRY || '8h',
    },
    verify: {
      algorithms: ['HS256'],
    },
    cookie: {
      cookieName: 'access_token',
      signed: false, // We use httpOnly instead
    },
  });

  // Validate JWT secret length - throw error in production
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    const message = 'JWT_SECRET is not set or too short (minimum 32 characters required)';

    if (process.env.NODE_ENV === 'production') {
      fastify.log.error(message);
      throw new Error(message);
    } else {
      fastify.log.warn(`${message}. Using default (INSECURE for production)`);
    }
  }

  fastify.log.info('JWT plugin registered');
}

/**
 * Cookie options for access token
 */
export const ACCESS_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const, // 'lax' required for OAuth redirect flow
  path: '/',
  maxAge: 8 * 60 * 60, // 8 hours in seconds
};

/**
 * Cookie options for refresh token
 */
export const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const, // 'lax' required for OAuth redirect flow
  path: '/',
  maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
};

/**
 * Clear cookie options
 */
export const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 0,
};
