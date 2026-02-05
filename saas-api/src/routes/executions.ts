import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { 
  getExecutions, 
  getExecutionById 
} from '../models/executions.model';

export default async function executionsRoutes(fastify: FastifyInstance) {
  // GET /api/executions - List executions (with filters)
  fastify.get('/api/executions', {
    preHandler: [authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          connectionId: { type: 'string' },
          status: { type: 'string' },
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
                  connectionId: { type: 'string' },
                  status: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { connectionId, status, dateRange } = request.query as any;
      const executions = await getExecutions({ connectionId, status, dateRange });
      return {
        success: true,
        data: executions
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch executions'
      });
    }
  });

  // GET /api/executions/:id - Get execution detail
  fastify.get('/api/executions/:id', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
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
                connectionId: { type: 'string' },
                status: { type: 'string' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
                timeline: { type: 'array' },
                metrics: { type: 'object' },
                verification: { type: 'object' },
                rollback: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const execution = await getExecutionById(id);
      
      if (!execution) {
        return reply.status(404).send({
          success: false,
          error: 'Execution not found'
        });
      }
      
      return {
        success: true,
        data: execution
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch execution'
      });
    }
  });
}