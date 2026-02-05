import { FastifyInstance } from 'fastify';
import connectionsRoutes from './connections';
import recommendationsRoutes from './recommendations';
import executionsRoutes from './executions';
import killSwitchRoutes from './kill-switch';
import auditRoutes from './audit';

export default async function registerRoutes(fastify: FastifyInstance) {
  // Register all routes
  await connectionsRoutes(fastify);
  await recommendationsRoutes(fastify);
  await executionsRoutes(fastify);
  await killSwitchRoutes(fastify);
  await auditRoutes(fastify);
}