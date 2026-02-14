import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { pool } from '../database';
import { AuthService } from '../services/auth.service';
import { UsersModel } from '../models/users.model';
import { GoogleOAuthService } from '../services/google-oauth.service';

// JWT payload type
interface JWTPayload {
  id: string;
  email: string;
  role: string;
  tenantId: string | null;
  jti: string;
  iat: number;
  exp: number;
}
import {
  ACCESS_TOKEN_COOKIE_OPTIONS,
  REFRESH_TOKEN_COOKIE_OPTIONS,
  CLEAR_COOKIE_OPTIONS,
} from '../plugins/jwt';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1, 'Full name is required').max(255),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

// In-memory store for OAuth state tokens (CSRF protection)
const oauthStateTokens = new Map<string, number>();

// Clean expired state tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [state, createdAt] of oauthStateTokens) {
    if (now - createdAt > 10 * 60 * 1000) {
      oauthStateTokens.delete(state);
    }
  }
}, 5 * 60 * 1000);

export default async function authRoutes(fastify: FastifyInstance) {
  // Initialize services inside the function to ensure pool is available
  const authService = new AuthService(pool);
  const usersModel = new UsersModel(pool);

  // Initialize Google OAuth (optional - only if env vars are set)
  let googleOAuthService: GoogleOAuthService | null = null;
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    try {
      googleOAuthService = new GoogleOAuthService();
      fastify.log.info('Google OAuth service initialized');
    } catch (error: any) {
      fastify.log.warn('Google OAuth not configured: ' + error.message);
    }
  }
  /**
   * POST /auth/login
   * Login with email and password
   */
  fastify.post(
    '/auth/login',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
        },
      },
      schema: {
        description: 'Login with email and password',
        tags: ['Authentication'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 1 },
            rememberMe: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
              user: { type: 'object' },
              expiresIn: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Validate request body
        const body = loginSchema.parse(request.body);

        // Get IP and user agent
        const ipAddress = request.ip;
        const userAgent = request.headers['user-agent'];

        // Perform login
        const result = await authService.login(
          {
            email: body.email,
            password: body.password,
            rememberMe: body.rememberMe,
          },
          fastify.jwt,
          ipAddress,
          userAgent
        );

        // Set cookies
        reply.setCookie('access_token', result.accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
        reply.setCookie('refresh_token', result.refreshToken, {
          ...REFRESH_TOKEN_COOKIE_OPTIONS,
          maxAge: body.rememberMe
            ? 90 * 24 * 60 * 60
            : REFRESH_TOKEN_COOKIE_OPTIONS.maxAge,
        });

        // Log successful login
        fastify.log.info({
          event: 'login_success',
          userId: result.user.id,
          email: result.user.email,
          ip: ipAddress,
        });

        return reply.send({
          success: true,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
          expiresIn: result.expiresIn,
        });
      } catch (error: any) {
        // Log failed login
        fastify.log.warn({
          event: 'login_failed',
          error: error.message,
          ip: request.ip,
        });

        // Parse error code
        if (error.message.startsWith('AUTH_')) {
          const [code, ...messageParts] = error.message.split(': ');
          const message = messageParts.join(': ');

          return reply.status(401).send({
            success: false,
            error: {
              code,
              message,
            },
          });
        }

        return reply.status(500).send({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'An error occurred during login',
          },
        });
      }
    }
  );

  /**
   * POST /auth/logout
   * Logout and invalidate tokens
   */
  fastify.post(
    '/auth/logout',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Logout and invalidate session',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = request.user as JWTPayload;

        // Revoke session
        await authService.logout(user.id, user.jti);

        // Clear cookies
        reply.clearCookie('access_token', CLEAR_COOKIE_OPTIONS);
        reply.clearCookie('refresh_token', { ...CLEAR_COOKIE_OPTIONS, path: '/auth/refresh' });

        fastify.log.info({
          event: 'logout',
          userId: user.id,
        });

        return reply.send({
          success: true,
          message: 'Logged out successfully',
        });
      } catch (error: any) {
        fastify.log.error({
          event: 'logout_failed',
          error: error.message,
        });

        return reply.status(500).send({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Failed to logout',
          },
        });
      }
    }
  );

  /**
   * POST /auth/refresh
   * Refresh access token
   */
  fastify.post(
    '/auth/refresh',
    {
      schema: {
        description: 'Refresh access token using refresh token',
        tags: ['Authentication'],
        body: {
          type: 'object',
          properties: {
            refreshToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              accessToken: { type: 'string' },
              expiresIn: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = refreshSchema.parse(request.body);

        // Get refresh token from cookie or body
        const refreshToken =
          body.refreshToken ||
          request.cookies.refresh_token;

        if (!refreshToken) {
          return reply.status(401).send({
            success: false,
            error: {
              code: 'AUTH_004',
              message: 'Refresh token not provided',
            },
          });
        }

        // Refresh token
        const result = await authService.refreshToken(refreshToken, fastify.jwt);

        // Set new access token cookie
        reply.setCookie('access_token', result.accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);

        fastify.log.info({
          event: 'token_refreshed',
        });

        return reply.send({
          success: true,
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
        });
      } catch (error: any) {
        fastify.log.warn({
          event: 'token_refresh_failed',
          error: error.message,
        });

        if (error.message.startsWith('AUTH_')) {
          const [code, ...messageParts] = error.message.split(': ');
          const message = messageParts.join(': ');

          return reply.status(401).send({
            success: false,
            error: {
              code,
              message,
            },
          });
        }

        return reply.status(500).send({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Failed to refresh token',
          },
        });
      }
    }
  );

  /**
   * GET /auth/me
   * Get current user profile
   */
  fastify.get(
    '/auth/me',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Get current authenticated user profile',
        tags: ['Profile'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              user: { type: 'object' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const currentUser = request.user as JWTPayload;

        // Get full user details
        const user = await usersModel.findById(currentUser.id);

        if (!user) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'User not found',
            },
          });
        }

        // Remove sensitive fields
        const { passwordHash, googleAccessToken, googleRefreshToken, ...userProfile } = user;

        return reply.send({
          success: true,
          user: userProfile,
        });
      } catch (error: any) {
        fastify.log.error({
          event: 'get_profile_failed',
          error: error.message,
        });

        return reply.status(500).send({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Failed to get user profile',
          },
        });
      }
    }
  );

  /**
   * POST /auth/change-password
   * Change password (authenticated)
   */
  fastify.post(
    '/auth/change-password',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Change password for authenticated user',
        tags: ['Password Management'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string' },
            newPassword: { type: 'string', minLength: 8 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const currentUser = request.user as JWTPayload;
        const body = changePasswordSchema.parse(request.body);

        // Change password
        await authService.changePassword(
          currentUser.id,
          body.currentPassword,
          body.newPassword
        );

        // Clear cookies (user will need to login again)
        reply.clearCookie('access_token', CLEAR_COOKIE_OPTIONS);
        reply.clearCookie('refresh_token', { ...CLEAR_COOKIE_OPTIONS, path: '/auth/refresh' });

        fastify.log.info({
          event: 'password_changed',
          userId: currentUser.id,
        });

        return reply.send({
          success: true,
          message: 'Password changed successfully. Please login again.',
        });
      } catch (error: any) {
        fastify.log.error({
          event: 'password_change_failed',
          userId: (request.user as JWTPayload)?.id,
          error: error.message,
        });

        if (error.message.startsWith('AUTH_')) {
          const [code, ...messageParts] = error.message.split(': ');
          const message = messageParts.join(': ');

          return reply.status(400).send({
            success: false,
            error: {
              code,
              message,
            },
          });
        }

        return reply.status(500).send({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Failed to change password',
          },
        });
      }
    }
  );

  /**
   * GET /auth/sessions
   * Get active sessions for current user
   */
  fastify.get(
    '/auth/sessions',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Get active sessions for current user',
        tags: ['Sessions'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              sessions: { type: 'array' },
              currentSessionId: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const currentUser = request.user as JWTPayload;

        const sessions = await authService.getUserSessions(currentUser.id);

        // Mark current session
        const sessionsWithCurrent = sessions.map((session) => ({
          id: session.id,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          deviceType: session.deviceType,
          deviceName: session.deviceName,
          location: session.location,
          createdAt: session.createdAt,
          lastActivityAt: session.lastActivityAt,
          isCurrent: session.accessTokenJti === currentUser.jti,
        }));

        return reply.send({
          success: true,
          sessions: sessionsWithCurrent,
          currentSessionId: currentUser.jti,
        });
      } catch (error: any) {
        fastify.log.error({
          event: 'get_sessions_failed',
          error: error.message,
        });

        return reply.status(500).send({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Failed to get sessions',
          },
        });
      }
    }
  );

  /**
   * POST /auth/sessions/revoke-all
   * Revoke all other sessions
   */
  fastify.post(
    '/auth/sessions/revoke-all',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Revoke all sessions except current',
        tags: ['Sessions'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              revokedCount: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const currentUser = request.user as JWTPayload;

        const revokedCount = await authService.revokeAllOtherSessions(
          currentUser.id,
          currentUser.jti
        );

        fastify.log.info({
          event: 'sessions_revoked',
          userId: currentUser.id,
          count: revokedCount,
        });

        return reply.send({
          success: true,
          revokedCount,
        });
      } catch (error: any) {
        fastify.log.error({
          event: 'revoke_sessions_failed',
          error: error.message,
        });

        return reply.status(500).send({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Failed to revoke sessions',
          },
        });
      }
    }
  );

  /**
   * POST /auth/forgot-password
   * Request password reset email
   */
  fastify.post(
    '/auth/forgot-password',
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: '15 minutes',
        },
      },
      schema: {
        description: 'Request password reset email',
        tags: ['Password Management'],
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = forgotPasswordSchema.parse(request.body);

        await authService.requestPasswordReset(body.email, request.ip);

        // Always return success (prevent email enumeration)
        fastify.log.info({
          event: 'forgot_password_requested',
          email: body.email,
          ip: request.ip,
        });

        return reply.send({
          success: true,
          message: 'If an account exists with this email, a reset link has been sent.',
        });
      } catch (error: any) {
        fastify.log.error({
          event: 'forgot_password_failed',
          error: error.message,
          ip: request.ip,
        });

        // Still return success to prevent enumeration
        return reply.send({
          success: true,
          message: 'If an account exists with this email, a reset link has been sent.',
        });
      }
    }
  );

  /**
   * POST /auth/reset-password
   * Reset password using token
   */
  fastify.post(
    '/auth/reset-password',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
        },
      },
      schema: {
        description: 'Reset password using reset token',
        tags: ['Password Management'],
        body: {
          type: 'object',
          required: ['token', 'newPassword'],
          properties: {
            token: { type: 'string' },
            newPassword: { type: 'string', minLength: 8 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = resetPasswordSchema.parse(request.body);

        await authService.resetPassword(body.token, body.newPassword, request.ip);

        fastify.log.info({
          event: 'password_reset_success',
          ip: request.ip,
        });

        return reply.send({
          success: true,
          message: 'Password has been reset successfully. Please login with your new password.',
        });
      } catch (error: any) {
        fastify.log.warn({
          event: 'password_reset_failed',
          error: error.message,
          ip: request.ip,
        });

        if (error.message.startsWith('AUTH_')) {
          const [code, ...messageParts] = error.message.split(': ');
          const message = messageParts.join(': ');

          return reply.status(400).send({
            success: false,
            error: { code, message },
          });
        }

        return reply.status(500).send({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Failed to reset password',
          },
        });
      }
    }
  );

  // TODO: Implement these endpoints:
  // - GET /auth/verify-email/:token
  // - POST /auth/resend-verification

  /**
   * POST /auth/register
   * Self-registration with email and password
   */
  fastify.post(
    '/auth/register',
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: '15 minutes',
        },
      },
      schema: {
        description: 'Register a new account with email and password',
        tags: ['Authentication'],
        body: {
          type: 'object',
          required: ['email', 'password', 'fullName'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            fullName: { type: 'string', minLength: 1 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
              user: { type: 'object' },
              expiresIn: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = registerSchema.parse(request.body);

        const ipAddress = request.ip;
        const userAgent = request.headers['user-agent'];

        const result = await authService.registerWithEmail(
          {
            email: body.email,
            password: body.password,
            fullName: body.fullName,
          },
          fastify.jwt,
          ipAddress,
          userAgent
        );

        // Set cookies
        reply.setCookie('access_token', result.accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
        reply.setCookie('refresh_token', result.refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

        fastify.log.info({
          event: 'register_success',
          userId: result.user.id,
          email: result.user.email,
          ip: ipAddress,
        });

        return reply.status(201).send({
          success: true,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
          expiresIn: result.expiresIn,
        });
      } catch (error: any) {
        fastify.log.warn({
          event: 'register_failed',
          error: error.message,
          ip: request.ip,
        });

        if (error.message.startsWith('AUTH_')) {
          const [code, ...messageParts] = error.message.split(': ');
          const message = messageParts.join(': ');

          return reply.status(400).send({
            success: false,
            error: { code, message },
          });
        }

        return reply.status(500).send({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'An error occurred during registration',
          },
        });
      }
    }
  );

  /**
   * GET /auth/google
   * Redirect to Google OAuth consent screen
   */
  fastify.get(
    '/auth/google',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!googleOAuthService) {
        return reply.status(501).send({
          success: false,
          error: {
            code: 'OAUTH_NOT_CONFIGURED',
            message: 'Google OAuth is not configured',
          },
        });
      }

      // Generate CSRF state token
      const state = crypto.randomBytes(32).toString('hex');
      oauthStateTokens.set(state, Date.now());

      const authUrl = googleOAuthService.getAuthorizationUrl(state);

      return reply.redirect(authUrl);
    }
  );

  /**
   * GET /auth/google/callback
   * Handle Google OAuth callback
   */
  fastify.get(
    '/auth/google/callback',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            state: { type: 'string' },
            error: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as { code?: string; state?: string; error?: string };
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      // Handle Google OAuth error
      if (query.error) {
        fastify.log.warn({
          event: 'google_oauth_error',
          error: query.error,
        });
        return reply.redirect(`${frontendUrl}/login?error=oauth_denied`);
      }

      if (!query.code || !query.state) {
        return reply.redirect(`${frontendUrl}/login?error=oauth_invalid`);
      }

      // Validate CSRF state token
      if (!oauthStateTokens.has(query.state)) {
        fastify.log.warn({
          event: 'google_oauth_invalid_state',
          ip: request.ip,
        });
        return reply.redirect(`${frontendUrl}/login?error=oauth_invalid_state`);
      }
      oauthStateTokens.delete(query.state);

      if (!googleOAuthService) {
        return reply.redirect(`${frontendUrl}/login?error=oauth_not_configured`);
      }

      try {
        // Exchange code for Google profile
        const profile = await googleOAuthService.verifyAndGetProfile(query.code);

        const ipAddress = request.ip;
        const userAgent = request.headers['user-agent'];

        // Login or register with Google
        const result = await authService.loginOrRegisterWithGoogle(
          profile,
          fastify.jwt,
          ipAddress,
          userAgent
        );

        // Set cookies
        reply.setCookie('access_token', result.accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
        reply.setCookie('refresh_token', result.refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

        fastify.log.info({
          event: 'google_login_success',
          userId: result.user.id,
          email: result.user.email,
          ip: ipAddress,
        });

        // Redirect to frontend
        return reply.redirect(`${frontendUrl}/admin`);
      } catch (error: any) {
        fastify.log.error({
          event: 'google_oauth_callback_failed',
          error: error.message,
          ip: request.ip,
        });

        return reply.redirect(`${frontendUrl}/login?error=oauth_failed`);
      }
    }
  );
}
