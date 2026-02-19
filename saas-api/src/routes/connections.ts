import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { 
  getConnections, 
  getConnectionById, 
  getConnectionDetailById,
  updateConnectionStatus, 
  createConnection,
  updateConnection,
  deleteConnection,
  getConnectionCredentials,
  CreateConnectionInput,
  UpdateConnectionInput
} from '../models/connections.model';
import { createScanRun, getLatestSchemaByConnectionId, getSchemaSnapshotsByConnectionId, getLatestQueryDigestsByConnectionId } from '../models/scan-runs.model';
import { computeSchemaDiff } from '../utils/schema-diff';
import mysql from 'mysql2/promise';

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
                  host: { type: 'string' },
                  port: { type: 'number' },
                  username: { type: 'string' },
                  databaseName: { type: ['string', 'null'] },
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

  // ============================================================
  // STATIC ROUTES - Must be registered BEFORE dynamic :id routes
  // ============================================================

  // POST /api/connections/test - Test connection without saving (for form validation)
  fastify.post('/api/connections/test', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          host: { type: 'string', minLength: 1 },
          port: { type: 'number', minimum: 1, maximum: 65535 },
          username: { type: 'string', minLength: 1 },
          password: { type: 'string', minLength: 1 },
          databaseName: { type: 'string' }
        },
        required: ['host', 'port', 'username', 'password']
      }
    }
  }, async (request, reply) => {
    try {
      const body = request.body as {
        host: string;
        port: number;
        username: string;
        password: string;
        databaseName?: string;
      };

      let connection;
      try {
        connection = await mysql.createConnection({
          host: body.host,
          port: body.port,
          user: body.username,
          password: body.password,
          database: body.databaseName || undefined,
          connectTimeout: 10000
        });

        await connection.query('SELECT 1');
        await connection.end();

        return {
          success: true,
          message: 'Connection successful',
          data: {
            host: body.host,
            port: body.port,
            connected: true
          }
        };
      } catch (mysqlError: any) {
        if (connection) {
          try {
            await connection.end();
          } catch (e) {
            // Ignore
          }
        }

        return reply.status(400).send({
          success: false,
          error: `Connection failed: ${mysqlError.message}`,
          data: {
            host: body.host,
            port: body.port,
            connected: false,
            errorCode: mysqlError.code
          }
        });
      }
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to test connection'
      });
    }
  });

  // POST /api/connections/databases - List databases from connection credentials
  fastify.post('/api/connections/databases', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          host: { type: 'string', minLength: 1 },
          port: { type: 'number', minimum: 1, maximum: 65535 },
          username: { type: 'string', minLength: 1 },
          password: { type: 'string', minLength: 1 }
        },
        required: ['host', 'port', 'username', 'password']
      }
    }
  }, async (request, reply) => {
    try {
      const body = request.body as {
        host: string;
        port: number;
        username: string;
        password: string;
      };

      let connection;
      try {
        connection = await mysql.createConnection({
          host: body.host,
          port: body.port,
          user: body.username,
          password: body.password,
          connectTimeout: 10000
        });

        // Get list of databases
        const [rows] = await connection.query('SHOW DATABASES');
        await connection.end();

        // Filter out system databases
        const systemDbs = ['information_schema', 'mysql', 'performance_schema', 'sys'];
        const databases = (rows as any[])
          .map((row: any) => row.Database)
          .filter((db: string) => !systemDbs.includes(db));

        return {
          success: true,
          data: {
            databases
          }
        };
      } catch (mysqlError: any) {
        if (connection) {
          try {
            await connection.end();
          } catch (e) {
            // Ignore
          }
        }

        return reply.status(400).send({
          success: false,
          error: `Failed to list databases: ${mysqlError.message}`
        });
      }
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to list databases'
      });
    }
  });

  // ============================================================
  // DYNAMIC ROUTES - With :id parameter
  // ============================================================

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
                host: { type: 'string' },
                port: { type: 'number' },
                username: { type: 'string' },
                databaseName: { type: ['string', 'null'] },
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
      // Use getConnectionDetailById to get full details including host, port, username
      const connection = await getConnectionDetailById(id);

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

  // POST /api/connections/:id/scan - Request a scan run for this connection (pending; agent will pick up)
  fastify.post('/api/connections/:id/scan', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                connectionProfileId: { type: 'string' },
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
      const connection = await getConnectionById(id);
      if (!connection) {
        return reply.status(404).send({
          success: false,
          error: 'Connection not found'
        });
      }
      const tenantId = (request as any).tenantId || process.env.TENANT_ID;
      if (!tenantId) {
        return reply.status(400).send({
          success: false,
          error: 'Tenant ID is required'
        });
      }
      const scanRun = await createScanRun(
        { tenantId, connectionProfileId: id },
        'pending'
      );
      return reply.status(201).send({
        success: true,
        data: scanRun
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to request scan'
      });
    }
  });

  // GET /api/connections/:id/credentials - Get connection credentials (for Agent only)
  fastify.get('/api/connections/:id/credentials', {
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
      const credentials = await getConnectionCredentials(id);

      if (!credentials) {
        return reply.status(404).send({
          success: false,
          error: 'Connection not found'
        });
      }

      return {
        success: true,
        data: credentials
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to get connection credentials'
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

  // POST /api/connections - Create a new connection
  fastify.post('/api/connections', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          host: { type: 'string', minLength: 1 },
          port: { type: 'number', minimum: 1, maximum: 65535 },
          username: { type: 'string', minLength: 1 },
          password: { type: 'string', minLength: 1 },
          databaseName: { type: 'string' }
        },
        required: ['name', 'host', 'port', 'username', 'password']
      }
    }
  }, async (request, reply) => {
    try {
      const body = request.body as {
        name: string;
        host: string;
        port: number;
        username: string;
        password: string;
        databaseName?: string;
      };
      
      // Get tenant_id from request (set by auth middleware)
      const tenantId = (request as any).tenantId || process.env.TENANT_ID;
      
      if (!tenantId) {
        return reply.status(400).send({
          success: false,
          error: 'Tenant ID is required'
        });
      }
      
      const input: CreateConnectionInput = {
        tenantId,
        name: body.name,
        host: body.host,
        port: body.port,
        username: body.username,
        password: body.password,
        databaseName: body.databaseName
      };
      
      const connection = await createConnection(input);
      
      return reply.status(201).send({
        success: true,
        data: connection
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to create connection'
      });
    }
  });

  // PUT /api/connections/:id - Update connection
  fastify.put('/api/connections/:id', {
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
          name: { type: 'string', minLength: 1 },
          host: { type: 'string', minLength: 1 },
          port: { type: 'number', minimum: 1, maximum: 65535 },
          username: { type: 'string', minLength: 1 },
          password: { type: 'string' },
          databaseName: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as UpdateConnectionInput;
      
      // Check if connection exists
      const existing = await getConnectionById(id);
      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: 'Connection not found'
        });
      }
      
      const connection = await updateConnection(id, body);
      
      return {
        success: true,
        data: connection
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to update connection'
      });
    }
  });

  // DELETE /api/connections/:id - Delete connection
  fastify.delete('/api/connections/:id', {
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
      
      const deleted = await deleteConnection(id);
      
      if (!deleted) {
        return reply.status(404).send({
          success: false,
          error: 'Connection not found'
        });
      }
      
      return {
        success: true,
        message: 'Connection deleted successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to delete connection'
      });
    }
  });

  // POST /api/connections/:id/test - Test connection
  fastify.post('/api/connections/:id/test', {
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
      
      const credentials = await getConnectionCredentials(id);
      
      if (!credentials) {
        return reply.status(404).send({
          success: false,
          error: 'Connection not found'
        });
      }
      
      // Try to connect to MySQL
      let connection;
      try {
        connection = await mysql.createConnection({
          host: credentials.host,
          port: credentials.port,
          user: credentials.username,
          password: credentials.password,
          database: credentials.databaseName || undefined,
          connectTimeout: 10000 // 10 seconds timeout
        });
        
        // Test query
        await connection.query('SELECT 1');
        
        await connection.end();
        
        return {
          success: true,
          message: 'Connection successful',
          data: {
            host: credentials.host,
            port: credentials.port,
            connected: true
          }
        };
      } catch (mysqlError: any) {
        if (connection) {
          try {
            await connection.end();
          } catch (e) {
            // Ignore close errors
          }
        }
        
        return reply.status(400).send({
          success: false,
          error: `Connection failed: ${mysqlError.message}`,
          data: {
            host: credentials.host,
            port: credentials.port,
            connected: false,
            errorCode: mysqlError.code
          }
        });
      }
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to test connection'
      });
    }
  });

  // GET /api/connections/:id/schema - Get latest schema snapshot for this connection
  fastify.get('/api/connections/:id/schema', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const connection = await getConnectionById(id);
      if (!connection) {
        return reply.status(404).send({ success: false, error: 'Connection not found' });
      }

      const snapshot = await getLatestSchemaByConnectionId(id);
      if (!snapshot) {
        return reply.status(404).send({ success: false, error: 'No schema snapshot found. Run a scan first.' });
      }

      return { success: true, data: snapshot };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch schema' });
    }
  });

  // GET /api/connections/:id/schema/history - Get schema snapshot history for diff
  fastify.get('/api/connections/:id/schema/history', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 20, default: 10 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { limit = 10 } = request.query as { limit?: number };

      const snapshots = await getSchemaSnapshotsByConnectionId(id, limit);

      return { success: true, data: snapshots };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch schema history' });
    }
  });

  // GET /api/connections/:id/schema/diff - Compare two schema snapshots
  fastify.get('/api/connections/:id/schema/diff', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'Older snapshot ID' },
          to: { type: 'string', description: 'Newer snapshot ID' }
        },
        required: ['from', 'to']
      }
    }
  }, async (request, reply) => {
    try {
      const { from: fromId, to: toId } = request.query as { from: string; to: string };

      const { id } = request.params as { id: string };
      const snapshots = await getSchemaSnapshotsByConnectionId(id, 20);
      const fromSnapshot = snapshots.find(s => s.id === fromId);
      const toSnapshot = snapshots.find(s => s.id === toId);

      if (!fromSnapshot || !toSnapshot) {
        return reply.status(404).send({ success: false, error: 'Snapshot not found' });
      }

      const diff = computeSchemaDiff(fromSnapshot, toSnapshot);

      return { success: true, data: diff };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to compute schema diff' });
    }
  });

  // GET /api/connections/:id/query-performance - Get latest query digests for this connection
  fastify.get('/api/connections/:id/query-performance', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const connection = await getConnectionById(id);
      if (!connection) {
        return reply.status(404).send({ success: false, error: 'Connection not found' });
      }

      const result = await getLatestQueryDigestsByConnectionId(id);
      if (!result) {
        return reply.status(404).send({ success: false, error: 'No query performance data found. Run a scan first.' });
      }

      return { success: true, data: result };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch query performance data' });
    }
  });

  // GET /api/connections/:id/detail - Get connection with full details (not password)
  fastify.get('/api/connections/:id/detail', {
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
      const connection = await getConnectionDetailById(id);
      
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
        error: 'Failed to fetch connection details'
      });
    }
  });
}