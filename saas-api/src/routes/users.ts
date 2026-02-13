import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { pool } from '../database';
import { UsersModel, UserRole } from '../models/users.model';
import { passwordService } from '../services/password.service';
import { AuthService } from '../services/auth.service';
import { requirePermission, requireRole } from '../plugins/rbac';

// JWT payload type
interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
  jti: string;
  iat: number;
  exp: number;
}

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  role: z.enum(['super_admin', 'admin', 'dba', 'developer', 'viewer']),
  tenantId: z.string().uuid().optional(),
  sendWelcomeEmail: z.boolean().optional(),
});

const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  role: z.enum(['super_admin', 'admin', 'dba', 'developer', 'viewer']).optional(),
});

const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'disabled']),
});

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['super_admin', 'admin', 'dba', 'developer', 'viewer']).optional(),
  status: z.enum(['active', 'disabled', 'locked']).optional(),
  tenantId: z.string().uuid().optional(),
  sortBy: z.enum(['email', 'fullName', 'createdAt', 'lastLoginAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export default async function usersRoutes(fastify: FastifyInstance) {
  // Initialize services inside the function to ensure pool is available
  const usersModel = new UsersModel(pool);
  const authService = new AuthService(pool);
  /**
   * GET /api/users
   * List all users (Admin only)
   */
  fastify.get(
    '/api/users',
    {
      preHandler: [
        fastify.authenticate,
        requirePermission('users', 'read'),
      ],
      schema: {
        description: 'List all users with pagination and filters',
        tags: ['User Management'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', minimum: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100 },
            search: { type: 'string' },
            role: { type: 'string', enum: ['super_admin', 'admin', 'dba', 'developer', 'viewer'] },
            status: { type: 'string', enum: ['active', 'disabled', 'locked'] },
            tenantId: { type: 'string', format: 'uuid' },
            sortBy: { type: 'string', enum: ['email', 'fullName', 'createdAt', 'lastLoginAt'] },
            sortOrder: { type: 'string', enum: ['asc', 'desc'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              users: { type: 'array' },
              pagination: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  page: { type: 'number' },
                  limit: { type: 'number' },
                  totalPages: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const currentUser = request.user as JWTPayload;
        const query = listUsersQuerySchema.parse(request.query);

        // Filter by tenant for non-super admins
        const filters: any = {
          search: query.search,
          role: query.role,
          status: query.status,
        };

        if (currentUser.role !== 'super_admin') {
          filters.tenantId = currentUser.tenantId;
        } else if (query.tenantId) {
          filters.tenantId = query.tenantId;
        }

        const result = await usersModel.list(
          filters,
          {
            page: query.page,
            limit: query.limit,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
          }
        );

        return reply.send({
          success: true,
          users: result.users,
          pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
          },
        });
      } catch (error: any) {
        fastify.log.error({
          event: 'list_users_failed',
          error: error.message,
        });

        return reply.status(500).send({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Failed to list users',
          },
        });
      }
    }
  );

  /**
   * POST /api/users
   * Create new user (Admin only)
   */
  fastify.post(
    '/api/users',
    {
      preHandler: [
        fastify.authenticate,
        requirePermission('users', 'create'),
      ],
      schema: {
        description: 'Create new user',
        tags: ['User Management'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['email', 'fullName', 'role'],
          properties: {
            email: { type: 'string', format: 'email' },
            fullName: { type: 'string', minLength: 2 },
            password: { type: 'string', minLength: 8 },
            role: { type: 'string', enum: ['admin', 'dba', 'developer', 'viewer'] },
            tenantId: { type: 'string', format: 'uuid' },
            sendWelcomeEmail: { type: 'boolean' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              user: { type: 'object' },
              temporaryPassword: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const currentUser = request.user as JWTPayload;
        const body = createUserSchema.parse(request.body);

        // Determine tenant ID
        let tenantId: string | null;
        if (currentUser.role === 'super_admin' && body.tenantId) {
          tenantId = body.tenantId;
        } else {
          tenantId = currentUser.tenantId;
        }

        // Check if email already exists
        const existingUser = await usersModel.findByEmail(body.email);
        if (existingUser) {
          return reply.status(409).send({
            success: false,
            error: {
              code: 'CONFLICT',
              message: 'Email already in use',
            },
          });
        }

        // Generate password if not provided
        let password = body.password;
        let temporaryPassword: string | undefined;

        if (!password) {
          temporaryPassword = passwordService.generateRandom(16);
          password = temporaryPassword;
        }

        // Validate password
        const validation = passwordService.validate(password);
        if (!validation.valid) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: validation.errors.join(', '),
            },
          });
        }

        // Hash password
        const passwordHash = await passwordService.hash(password);

        // Create user
        const user = await usersModel.create({
          tenantId: tenantId || '',
          email: body.email,
          passwordHash,
          fullName: body.fullName,
          role: body.role as UserRole,
          status: 'active',
          emailVerified: false,
          createdBy: currentUser.id,
        });

        fastify.log.info({
          event: 'user_created',
          userId: user.id,
          createdBy: currentUser.id,
        });

        // TODO: Send welcome email if sendWelcomeEmail is true

        const response: any = {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            status: user.status,
            tenantId: user.tenantId,
            createdAt: user.createdAt,
          },
        };

        if (temporaryPassword) {
          response.temporaryPassword = temporaryPassword;
        }

        return reply.status(201).send(response);
      } catch (error: any) {
        fastify.log.error({
          event: 'create_user_failed',
          error: error.message,
        });

        return reply.status(500).send({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Failed to create user',
          },
        });
      }
    }
  );

  /**
   * GET /api/users/:userId
   * Get user details (Admin or self)
   */
  fastify.get(
    '/api/users/:userId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Get user details',
        tags: ['User Management'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
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
    async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
      try {
        const currentUser = request.user as JWTPayload;
        const { userId } = request.params;

        // Check access permission
        const canAccess = await usersModel.canAccessUser(currentUser.id, userId);
        if (!canAccess) {
          return reply.status(403).send({
            success: false,
            error: {
              code: 'AUTH_006',
              message: 'Insufficient permissions',
            },
          });
        }

        const user = await usersModel.findById(userId);
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
        const { passwordHash, googleAccessToken, googleRefreshToken, ...userDetails } = user;

        return reply.send({
          success: true,
          user: userDetails,
        });
      } catch (error: any) {
        fastify.log.error({
          event: 'get_user_failed',
          error: error.message,
        });

        return reply.status(500).send({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Failed to get user',
          },
        });
      }
    }
  );

  /**
   * PUT /api/users/:userId
   * Update user (Admin only)
   */
  fastify.put(
    '/api/users/:userId',
    {
      preHandler: [
        fastify.authenticate,
        requirePermission('users', 'update'),
      ],
      schema: {
        description: 'Update user information',
        tags: ['User Management'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            fullName: { type: 'string', minLength: 2 },
            role: { type: 'string', enum: ['admin', 'dba', 'developer', 'viewer'] },
          },
        },
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
    async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
      try {
        const currentUser = request.user as JWTPayload;
        const { userId } = request.params;
        const body = updateUserSchema.parse(request.body);

        // Check if user exists
        const existingUser = await usersModel.findById(userId);
        if (!existingUser) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'User not found',
            },
          });
        }

        // Non-super admins can only update users in their tenant
        if (currentUser.role !== 'super_admin' && existingUser.tenantId !== currentUser.tenantId) {
          return reply.status(403).send({
            success: false,
            error: {
              code: 'AUTH_006',
              message: 'Cannot update users from other tenants',
            },
          });
        }

        // Update user
        const updatedUser = await usersModel.update(userId, {
          email: body.email,
          fullName: body.fullName,
          role: body.role as UserRole,
        });

        fastify.log.info({
          event: 'user_updated',
          userId,
          updatedBy: currentUser.id,
        });

        // Remove sensitive fields
        const { passwordHash, googleAccessToken, googleRefreshToken, ...userDetails } = updatedUser!;

        return reply.send({
          success: true,
          user: userDetails,
        });
      } catch (error: any) {
        fastify.log.error({
          event: 'update_user_failed',
          error: error.message,
        });

        return reply.status(500).send({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Failed to update user',
          },
        });
      }
    }
  );

  /**
   * PATCH /api/users/:userId/status
   * Update user status (Admin only)
   */
  fastify.patch(
    '/api/users/:userId/status',
    {
      preHandler: [
        fastify.authenticate,
        requirePermission('users', 'update'),
      ],
      schema: {
        description: 'Enable or disable user account',
        tags: ['User Management'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['active', 'disabled'] },
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
    async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
      try {
        const currentUser = request.user as JWTPayload;
        const { userId } = request.params;
        const body = updateUserStatusSchema.parse(request.body);

        // Cannot disable self
        if (userId === currentUser.id) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Cannot disable your own account',
            },
          });
        }

        await usersModel.update(userId, { status: body.status });

        fastify.log.info({
          event: 'user_status_updated',
          userId,
          status: body.status,
          updatedBy: currentUser.id,
        });

        return reply.send({
          success: true,
          message: `User ${body.status === 'active' ? 'enabled' : 'disabled'} successfully`,
        });
      } catch (error: any) {
        fastify.log.error({
          event: 'update_user_status_failed',
          error: error.message,
        });

        return reply.status(500).send({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Failed to update user status',
          },
        });
      }
    }
  );

  /**
   * DELETE /api/users/:userId
   * Delete user (Admin only)
   */
  fastify.delete(
    '/api/users/:userId',
    {
      preHandler: [
        fastify.authenticate,
        requirePermission('users', 'delete'),
      ],
      schema: {
        description: 'Permanently delete user',
        tags: ['User Management'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
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
    async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
      try {
        const currentUser = request.user as JWTPayload;
        const { userId } = request.params;

        // Cannot delete self
        if (userId === currentUser.id) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Cannot delete your own account',
            },
          });
        }

        const deleted = await usersModel.delete(userId);
        if (!deleted) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'User not found',
            },
          });
        }

        fastify.log.info({
          event: 'user_deleted',
          userId,
          deletedBy: currentUser.id,
        });

        return reply.send({
          success: true,
          message: 'User deleted successfully',
        });
      } catch (error: any) {
        fastify.log.error({
          event: 'delete_user_failed',
          error: error.message,
        });

        return reply.status(500).send({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Failed to delete user',
          },
        });
      }
    }
  );

  /**
   * POST /api/users/:userId/unlock
   * Unlock user account (Admin only)
   */
  fastify.post(
    '/api/users/:userId/unlock',
    {
      preHandler: [
        fastify.authenticate,
        requireRole('super_admin', 'admin'),
      ],
      schema: {
        description: 'Unlock locked user account',
        tags: ['User Management'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
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
    async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
      try {
        const { userId } = request.params;

        await authService.unlockAccount(userId);

        fastify.log.info({
          event: 'user_unlocked',
          userId,
          unlockedBy: (request.user as JWTPayload).id,
        });

        return reply.send({
          success: true,
          message: 'User account unlocked successfully',
        });
      } catch (error: any) {
        fastify.log.error({
          event: 'unlock_user_failed',
          error: error.message,
        });

        return reply.status(500).send({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Failed to unlock user',
          },
        });
      }
    }
  );
}
