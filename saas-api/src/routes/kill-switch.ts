import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { 
  getKillSwitchStatus, 
  getGlobalKillSwitchStatus, 
  getConnectionKillSwitchStatuses, 
  toggleKillSwitch 
} from '../models/kill-switch.model';

export default async function killSwitchRoutes(fastify: FastifyInstance) {
  // GET /api/kill-switch - Get all kill switch status (global + per-connection)
  fastify.get('/api/kill-switch', {
    preHandler: [authenticate],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                global: { type: 'boolean' },
                connections: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      connectionId: { type: 'string' },
                      enabled: { type: 'boolean' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const status = await getKillSwitchStatus();
      return {
        success: true,
        data: status
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch kill switch status'
      });
    }
  });

  // GET /api/kill-switch/global - Get global kill switch status
  fastify.get('/api/kill-switch/global', {
    preHandler: [authenticate],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const status = await getGlobalKillSwitchStatus();
      return {
        success: true,
        data: status
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch global kill switch status'
      });
    }
  });

  // GET /api/kill-switch/connections - Get per-connection kill switch statuses
  fastify.get('/api/kill-switch/connections', {
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
                  connectionId: { type: 'string' },
                  enabled: { type: 'boolean' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const statuses = await getConnectionKillSwitchStatuses();
      return {
        success: true,
        data: statuses
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch connection kill switch statuses'
      });
    }
  });

  // POST /api/kill-switch/toggle - Toggle kill switch
  fastify.post('/api/kill-switch/toggle', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          connectionId: { type: 'string' },
          enabled: { type: 'boolean' },
          reason: { type: 'string' }
        },
        required: ['connectionId', 'enabled', 'reason']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                connectionId: { type: 'string' },
                enabled: { type: 'boolean' },
                reason: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { connectionId, enabled, reason } = request.body as { 
        connectionId: string; 
        enabled: boolean; 
        reason: string 
      };
      
      const result = await toggleKillSwitch(connectionId, enabled, reason);
      
      if (!result) {
        return reply.status(404).send({
          success: false,
          error: 'Connection not found'
        });
      }
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to toggle kill switch'
      });
    }
  });
}