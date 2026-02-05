import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { getConnections, getConnectionById, updateConnectionStatus } from '../models/connections.model';

export default async function connectionsRoutes(fastify: FastifyInstance) {
  // GET /api/connections - List all connections
  fastify.get('/api/connections', {
    preHandler: [authenticate],
    schema: {
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
                  name: { type: 'string' },
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
      const connections = await getConnections();
      return {
        success: true,
        data: connections
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch connections'
      });
    }
  });

  // GET /api/connections/:id - Get connection detail
  fastify.get('/api/connections/:id', {
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
                name: { type: 'string' },
                status: { type: 'string' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const connection = await getConnectionById(id);
      
      if (!connection) {
        return reply.status(404).send({
          success: false,
          error: 'Connection not found'
        });
      }
      
      return {
        success: true,
        data: connection
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch connection'
      });
    }
  });

  // PATCH /api/connections/:id/status - Update connection status
  fastify.patch('/api/connections/:id/status', {
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
          status: { type: 'string', enum: ['active', 'disabled'] }
        },
        required: ['status']
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
                status: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { status } = request.body as { status: string };
      
      // ตรวจสอบว่า status ถูกต้อง
      if (!['active', 'disabled'].includes(status)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid status. Must be "active" or "disabled"'
        });
      }
      
      const connection = await updateConnectionStatus(id, status as 'active' | 'disabled');
      
      if (!connection) {
        return reply.status(404).send({
          success: false,
          error: 'Connection not found'
        });
      }
      
      return {
        success: true,
        data: connection
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to update connection status'
      });
    }
  });
}