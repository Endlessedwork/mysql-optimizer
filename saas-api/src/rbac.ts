import { FastifyInstance } from 'fastify';
import { rbacPlugin } from './plugins/rbac';

export async function setupRBAC(app: FastifyInstance): Promise<void> {
  // Register RBAC plugin with permission checking
  await rbacPlugin(app);

  app.log.info('RBAC setup completed');
}
