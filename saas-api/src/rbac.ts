import { FastifyInstance } from 'fastify';

export function setupRBAC(app: FastifyInstance): void {
  // RBAC plugin registration placeholder – extend when roles/policies are defined
  app.decorate('rbac', {
    check: async (_role: string, _resource: string, _action: string) => true
  });
}
