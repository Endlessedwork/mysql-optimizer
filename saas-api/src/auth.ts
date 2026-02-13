import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { jwtPlugin } from './plugins/jwt';
import { rateLimitPlugin } from './plugins/rate-limit';
import { pool } from './database';
import { AuthService } from './services/auth.service';

const authService = new AuthService(pool);

export async function setupAuth(app: FastifyInstance): Promise<void> {
  // Register JWT and Cookie plugins
  await jwtPlugin(app);

  // Register rate limit plugin
  await rateLimitPlugin(app);

  // Register authentication decorator
  app.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      // Try to get token from Authorization header or cookie
      let token: string | undefined;

      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      } else if (request.cookies.access_token) {
        token = request.cookies.access_token;
      }

      if (!token) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'AUTH_005',
            message: 'Authentication required',
          },
        });
      }

      // Verify JWT token
      const decoded = app.jwt.verify(token) as any;

      // Validate session (optional - check if token is not revoked)
      // const user = await authService.validateSession(decoded.jti);
      // if (!user) {
      //   return reply.status(401).send({
      //     success: false,
      //     error: {
      //       code: 'AUTH_005',
      //       message: 'Session expired or revoked',
      //     },
      //   });
      // }

      // Attach user to request
      (request as any).user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        tenantId: decoded.tenantId,
        jti: decoded.jti,
      };
    } catch (error: any) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'AUTH_005',
          message: 'Invalid or expired token',
        },
      });
    }
  });

  app.log.info('Authentication setup completed');
}

// Type augmentation for TypeScript
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
