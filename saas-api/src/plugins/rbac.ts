import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '../models/users.model';

export type Resource =
  | 'users'
  | 'connections'
  | 'recommendations'
  | 'executions'
  | 'kill_switch'
  | 'audit_logs'
  | 'dashboard';

export type Action = 'create' | 'read' | 'update' | 'delete' | 'execute' | 'approve';

/**
 * Permission matrix defining what each role can do
 */
export const PERMISSIONS: Record<UserRole, Record<Resource, Action[]>> = {
  super_admin: {
    users: ['create', 'read', 'update', 'delete'],
    connections: ['create', 'read', 'update', 'delete'],
    recommendations: ['read', 'approve', 'execute'],
    executions: ['read', 'execute'],
    kill_switch: ['execute'],
    audit_logs: ['read'],
    dashboard: ['read'],
  },
  admin: {
    users: ['create', 'read', 'update', 'delete'], // Tenant-scoped
    connections: ['create', 'read', 'update', 'delete'],
    recommendations: ['read', 'approve', 'execute'],
    executions: ['read', 'execute'],
    kill_switch: ['execute'],
    audit_logs: ['read'],
    dashboard: ['read'],
  },
  dba: {
    users: [],
    connections: ['create', 'read', 'update', 'delete'],
    recommendations: ['read', 'approve', 'execute'],
    executions: ['read', 'execute'],
    kill_switch: ['execute'],
    audit_logs: ['read'],
    dashboard: ['read'],
  },
  developer: {
    users: [],
    connections: ['read'],
    recommendations: ['read'],
    executions: ['read'],
    kill_switch: [],
    audit_logs: ['read'],
    dashboard: ['read'],
  },
  viewer: {
    users: [],
    connections: ['read'],
    recommendations: ['read'],
    executions: ['read'],
    kill_switch: [],
    audit_logs: ['read'],
    dashboard: ['read'],
  },
};

/**
 * Check if role has permission for resource and action
 */
export function hasPermission(role: UserRole, resource: Resource, action: Action): boolean {
  const rolePermissions = PERMISSIONS[role];
  if (!rolePermissions) return false;

  const resourcePermissions = rolePermissions[resource];
  if (!resourcePermissions) return false;

  return resourcePermissions.includes(action);
}

/**
 * Middleware factory to require specific permission
 */
export function requirePermission(resource: Resource, action: Action) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'AUTH_005',
          message: 'Authentication required',
        },
      });
    }

    const allowed = hasPermission(user.role, resource, action);

    if (!allowed) {
      // Log permission denial
      request.log.warn({
        userId: user.id,
        role: user.role,
        resource,
        action,
        message: 'Permission denied',
      });

      return reply.status(403).send({
        success: false,
        error: {
          code: 'AUTH_006',
          message: 'Insufficient permissions',
        },
      });
    }
  };
}

/**
 * Middleware to require specific role(s)
 */
export function requireRole(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'AUTH_005',
          message: 'Authentication required',
        },
      });
    }

    if (!roles.includes(user.role)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'AUTH_006',
          message: 'Insufficient permissions',
        },
      });
    }
  };
}

/**
 * Middleware to check tenant access
 */
export function requireTenantAccess() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const requestedTenantId = request.headers['x-tenant-id'] || (request.query as Record<string, string>)?.['tenantId'];

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'AUTH_005',
          message: 'Authentication required',
        },
      });
    }

    // Super admin can access all tenants
    if (user.role === 'super_admin') {
      return;
    }

    // Regular users can only access their own tenant
    if (requestedTenantId && requestedTenantId !== user.tenantId) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'AUTH_006',
          message: 'Access denied to this tenant',
        },
      });
    }
  };
}

/**
 * Fastify plugin to register RBAC decorators
 */
export async function rbacPlugin(fastify: FastifyInstance) {
  // Decorate request with permission checking utilities
  fastify.decorateRequest('can', function (resource: Resource, action: Action) {
    const user = (this as any).user;
    if (!user) return false;
    return hasPermission(user.role, resource, action);
  });

  fastify.decorateRequest('hasRole', function (...roles: UserRole[]) {
    const user = (this as any).user;
    if (!user) return false;
    return roles.includes(user.role);
  });

  fastify.decorateRequest('isSuperAdmin', function () {
    const user = (this as any).user;
    return user?.role === 'super_admin';
  });

  // Add helpers to fastify instance
  fastify.decorate('rbac', {
    hasPermission,
    requirePermission,
    requireRole,
    requireTenantAccess,
    PERMISSIONS,
  });
}

// Type augmentation for TypeScript
declare module 'fastify' {
  interface FastifyRequest {
    can(resource: Resource, action: Action): boolean;
    hasRole(...roles: UserRole[]): boolean;
    isSuperAdmin(): boolean;
    // Note: user is already declared by @fastify/jwt, we use type assertions in code
  }

  interface FastifyInstance {
    rbac: {
      hasPermission: typeof hasPermission;
      requirePermission: typeof requirePermission;
      requireRole: typeof requireRole;
      requireTenantAccess: typeof requireTenantAccess;
      PERMISSIONS: typeof PERMISSIONS;
    };
  }
}
