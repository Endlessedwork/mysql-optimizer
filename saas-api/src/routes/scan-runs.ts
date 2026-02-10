import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import {
  getScanRuns,
  getScanRunById,
  createScanRun,
  updateScanRunStatus,
  createSchemaSnapshot,
  getSchemaSnapshotByScanRunId,
  createQueryDigests,
  getQueryDigestsByScanRunId,
  QueryDigestInput
} from '../models/scan-runs.model';

export default async function scanRunsRoutes(fastify: FastifyInstance) {
  // GET /api/scan-runs - List scan runs
  fastify.get('/api/scan-runs', {
    preHandler: [authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          connectionProfileId: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed'] }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const query = request.query as { connectionProfileId?: string; status?: string };
      const tenantId = (request as any).tenantId || process.env.TENANT_ID;
      
      const scanRuns = await getScanRuns({
        tenantId,
        connectionProfileId: query.connectionProfileId,
        status: query.status
      });
      
      return {
        success: true,
        data: scanRuns
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch scan runs'
      });
    }
  });

  // GET /api/scan-runs/:id - Get scan run detail
  fastify.get('/api/scan-runs/:id', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const scanRun = await getScanRunById(id);
      
      if (!scanRun) {
        return reply.status(404).send({
          success: false,
          error: 'Scan run not found'
        });
      }
      
      return {
        success: true,
        data: scanRun
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch scan run'
      });
    }
  });

  // POST /api/scan-runs - Create a new scan run
  fastify.post('/api/scan-runs', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          connectionProfileId: { type: 'string' }
        },
        required: ['connectionProfileId']
      }
    }
  }, async (request, reply) => {
    try {
      const body = request.body as { connectionProfileId: string };
      const tenantId = (request as any).tenantId || process.env.TENANT_ID;
      
      if (!tenantId) {
        return reply.status(400).send({
          success: false,
          error: 'Tenant ID is required'
        });
      }
      
      const scanRun = await createScanRun({
        tenantId,
        connectionProfileId: body.connectionProfileId
      });
      
      return reply.status(201).send({
        success: true,
        data: scanRun
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to create scan run'
      });
    }
  });

  // PATCH /api/scan-runs/:id/status - Update scan run status
  fastify.patch('/api/scan-runs/:id/status', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed'] },
          errorMessage: { type: 'string' }
        },
        required: ['status']
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as { status: 'pending' | 'running' | 'completed' | 'failed'; errorMessage?: string };
      
      const scanRun = await updateScanRunStatus(id, body.status, body.errorMessage);
      
      if (!scanRun) {
        return reply.status(404).send({
          success: false,
          error: 'Scan run not found'
        });
      }
      
      return {
        success: true,
        data: scanRun
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to update scan run status'
      });
    }
  });

  // POST /api/scan-runs/:id/schema-snapshot - Create schema snapshot
  fastify.post('/api/scan-runs/:id/schema-snapshot', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          tables: { type: 'array' },
          columns: { type: 'array' },
          indexes: { type: 'array' },
          views: { type: 'array' },
          procedures: { type: 'array' },
          functions: { type: 'array' },
          triggers: { type: 'array' },
          events: { type: 'array' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as {
        tables?: any[];
        columns?: any[];
        indexes?: any[];
        views?: any[];
        procedures?: any[];
        functions?: any[];
        triggers?: any[];
        events?: any[];
      };
      
      // Check if scan run exists
      const scanRun = await getScanRunById(id);
      if (!scanRun) {
        return reply.status(404).send({
          success: false,
          error: 'Scan run not found'
        });
      }
      
      const snapshot = await createSchemaSnapshot(id, body);
      
      return reply.status(201).send({
        success: true,
        data: snapshot
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to create schema snapshot'
      });
    }
  });

  // GET /api/scan-runs/:id/schema-snapshot - Get schema snapshot
  fastify.get('/api/scan-runs/:id/schema-snapshot', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      const snapshot = await getSchemaSnapshotByScanRunId(id);
      
      if (!snapshot) {
        return reply.status(404).send({
          success: false,
          error: 'Schema snapshot not found'
        });
      }
      
      return {
        success: true,
        data: snapshot
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch schema snapshot'
      });
    }
  });

  // POST /api/scan-runs/:id/query-digests - Create query digests (bulk)
  fastify.post('/api/scan-runs/:id/query-digests', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          digests: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                digest: { type: 'string' },
                digestText: { type: 'string' },
                countStar: { type: 'number' },
                sumTimerWait: { type: 'number' },
                avgTimerWait: { type: 'number' },
                minTimerWait: { type: 'number' },
                maxTimerWait: { type: 'number' },
                sumRowsExamined: { type: 'number' },
                avgRowsExamined: { type: 'number' },
                sumRowsSent: { type: 'number' },
                avgRowsSent: { type: 'number' }
              },
              required: ['digest', 'digestText']
            }
          }
        },
        required: ['digests']
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as { digests: QueryDigestInput[] };
      
      // Check if scan run exists
      const scanRun = await getScanRunById(id);
      if (!scanRun) {
        return reply.status(404).send({
          success: false,
          error: 'Scan run not found'
        });
      }
      
      const count = await createQueryDigests(id, body.digests);
      
      return reply.status(201).send({
        success: true,
        data: {
          insertedCount: count
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to create query digests'
      });
    }
  });

  // GET /api/scan-runs/:id/query-digests - Get query digests
  fastify.get('/api/scan-runs/:id/query-digests', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      const digests = await getQueryDigestsByScanRunId(id);
      
      return {
        success: true,
        data: digests
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch query digests'
      });
    }
  });
}
