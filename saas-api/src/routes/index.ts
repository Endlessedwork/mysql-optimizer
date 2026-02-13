import { FastifyInstance } from 'fastify';
import authRoutes from './auth';
import usersRoutes from './users';
import connectionsRoutes from './connections';
import recommendationsRoutes from './recommendations';
import executionsRoutes from './executions';
import killSwitchRoutes from './kill-switch';
import auditRoutes from './audit';
import scanRunsRoutes from './scan-runs';

export default async function registerRoutes(fastify: FastifyInstance) {
  // Register authentication routes (no auth required)
  await authRoutes(fastify);

  // Register user management routes (auth required)
  await usersRoutes(fastify);

  // Register existing routes
  await connectionsRoutes(fastify);
  await recommendationsRoutes(fastify);
  await executionsRoutes(fastify);
  await killSwitchRoutes(fastify);
  await auditRoutes(fastify);
  await scanRunsRoutes(fastify);
}