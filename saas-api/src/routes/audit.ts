import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { 
  getAuditLogs,
  createAuditLog 
} from '../models/audit.model';

export default async function auditRoutes(fastify: FastifyInstance) {
  // GET /api/audit - List audit logs (with filters)
  fastify.get('/api/audit', {
    preHandler: [authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          action: { type: 'string' },
          connectionId: { type: 'string' },
          dateRange: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  action: { type: 'string' },
                  connectionId: { type: 'string' },
                  timestamp: { type: 'string' },
                  userId: { type: 'string' },
                  details: { type: 'object' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { action, connectionId, dateRange } = request.query as any;
      const auditLogs = await getAuditLogs({ action, connectionId, dateRange });
      return {
        success: true,
        data: auditLogs
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch audit logs'
      });
    }
  });

  // POST /api/audit - Create audit log
  fastify.post('/api/audit', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          action: { type: 'string' },
          connectionId: { type: 'string' },
          userId: { type: 'string' },
          details: { type: 'object' }
        },
        required: ['action', 'connectionId', 'userId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                action: { type: 'string' },
                connectionId: { type: 'string' },
                timestamp: { type: 'string' },
                userId: { type: 'string' },
                details: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { action, connectionId, userId, details } = request.body as { 
        action: string; 
        connectionId: string; 
        userId: string; 
        details?: object 
      };
      
      const auditLog = await createAuditLog({ action, connectionId, userId, details });
      
      return {
        success: true,
        data: auditLog
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to create audit log'
      });
    }
  });
}