import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { 
  getKillSwitchStatus, 
  getGlobalKillSwitchStatus, 
  getConnectionKillSwitchStatuses, 
  toggleKillSwitch,
  toggleGlobalKillSwitch
} from '../models/kill-switch.model';
import { Database } from '../database';

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

  // POST /api/kill-switch/global/toggle - Toggle global kill switch
  fastify.post('/api/kill-switch/global/toggle', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          reason: { type: 'string' }
        },
        required: ['enabled']
      }
    }
  }, async (request, reply) => {
    try {
      const { enabled, reason } = request.body as { enabled: boolean; reason?: string };
      
      const result = await toggleGlobalKillSwitch(enabled, reason);
      
      if (!result) {
        return reply.status(500).send({
          success: false,
          error: 'Failed to toggle global kill switch'
        });
      }
      
      // Log to audit
      try {
        await Database.query(
          `INSERT INTO audit_logs (entity_type, action, changes, performed_by)
          VALUES ('kill_switch', $1, $2, 'admin')`,
          [
            enabled ? 'global_enabled' : 'global_disabled',
            JSON.stringify({ enabled, reason })
          ]
        );
      } catch (auditError) {
        fastify.log.error({ err: auditError }, 'Failed to log audit');
        // Continue even if audit fails
      }
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to toggle global kill switch'
      });
    }
  });

  // GET /api/kill-switch/audit-logs - Get kill switch audit logs
  fastify.get('/api/kill-switch/audit-logs', {
    preHandler: [authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const query = request.query as { limit?: number; offset?: number };
      const limit = query.limit || 50;
      const offset = query.offset || 0;
      
      const result = await Database.query<any>(
        `SELECT id, entity_type as "entityType", action, changes, 
          performed_by as "performedBy", created_at as "createdAt"
        FROM audit_logs
        WHERE entity_type = 'kill_switch'
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      
      const countResult = await Database.query<any>(
        `SELECT COUNT(*) as total FROM audit_logs WHERE entity_type = 'kill_switch'`
      );
      
      return {
        success: true,
        data: {
          logs: result.rows.map((row: any) => ({
            id: row.id,
            entityType: row.entityType,
            action: row.action,
            changes: row.changes,
            performedBy: row.performedBy,
            createdAt: row.createdAt?.toISOString() || row.createdAt
          })),
          total: parseInt(countResult.rows[0].total),
          limit,
          offset
        }
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch kill switch audit logs'
      });
    }
  });
}