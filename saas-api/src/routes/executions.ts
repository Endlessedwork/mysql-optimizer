import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { recordAgentPoll, getLastAgentPollTime } from '../utils/agent-heartbeat';
import {
  getExecutions,
  getExecutionById,
  createExecution,
  claimExecution,
  updateExecutionStatus,
  getScheduledExecutions,
  createVerificationMetrics,
  recordRollback,
  getExecutionWithRecommendations,
  getAgentStatus,
  CreateExecutionInput,
  VerificationMetricsInput,
  RollbackInput
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
                  connectionName: { type: 'string' },
                  databaseName: { type: 'string' },
                  status: { type: 'string' },
                  executedSql: { type: 'string' },
                  errorMessage: { type: 'string' },
                  recommendationIndex: { type: ['integer', 'null'] },
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
                connectionName: { type: 'string' },
                databaseName: { type: 'string' },
                recommendationPackId: { type: 'string' },
                recommendationIndex: { type: ['integer', 'null'] },
                status: { type: 'string' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
                timeline: { type: 'array' },
                metrics: { type: 'object' },
                verification: { type: 'object' },
                rollback: { type: 'object' },
                recommendations: { type: 'array' },
                executedSql: { type: 'string' }
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

  // GET /api/executions/:id/detail - Get full execution detail with recommendations (for Agent)
  fastify.get('/api/executions/:id/detail', {
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
      const detail = await getExecutionWithRecommendations(id);
      
      if (!detail) {
        return reply.status(404).send({
          success: false,
          error: 'Execution not found'
        });
      }
      
      return {
        success: true,
        data: detail
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch execution detail'
      });
    }
  });

  // POST /api/executions - Create execution from approved recommendation
  fastify.post('/api/executions', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          approvalId: { type: 'string' }
        },
        required: ['approvalId']
      }
    }
  }, async (request, reply) => {
    try {
      const body = request.body as CreateExecutionInput;
      
      const execution = await createExecution(body);
      
      return reply.status(201).send({
        success: true,
        data: execution
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to create execution'
      });
    }
  });

  // GET /api/executions/scheduled - Get scheduled/pending executions for Agent
  fastify.get('/api/executions/scheduled', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      // Record heartbeat — Agent is alive if it polls this endpoint
      recordAgentPoll();

      const executions = await getScheduledExecutions();
      return {
        success: true,
        data: executions
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch scheduled executions'
      });
    }
  });

  // POST /api/executions/:id/claim - Agent claims execution (atomic)
  fastify.post('/api/executions/:id/claim', {
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
          agentId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as { agentId?: string };
      
      const agentId = body.agentId || 'default-agent';
      const execution = await claimExecution(id, agentId);
      
      if (!execution) {
        return reply.status(409).send({
          success: false,
          error: 'Execution already claimed or not found'
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
        error: 'Failed to claim execution'
      });
    }
  });

  // PATCH /api/executions/:id/status - Update execution status
  fastify.patch('/api/executions/:id/status', {
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
          status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed', 'cancelled'] },
          errorMessage: { type: 'string' }
        },
        required: ['status']
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as { status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'; errorMessage?: string };
      
      const execution = await updateExecutionStatus(id, body.status, body.errorMessage);
      
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
        error: 'Failed to update execution status'
      });
    }
  });

  // POST /api/verification-metrics - Agent submits before/after metrics
  fastify.post('/api/verification-metrics', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          executionId: { type: 'string' },
          beforeMetrics: { type: 'object' },
          afterMetrics: { type: 'object' }
        },
        required: ['executionId', 'beforeMetrics', 'afterMetrics']
      }
    }
  }, async (request, reply) => {
    try {
      const body = request.body as VerificationMetricsInput;
      
      const result = await createVerificationMetrics(body);
      
      return reply.status(201).send({
        success: true,
        data: result
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to create verification metrics'
      });
    }
  });

  // POST /api/rollbacks - Agent records rollback
  fastify.post('/api/rollbacks', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          executionId: { type: 'string' },
          rollbackType: { type: 'string' },
          triggerReason: { type: 'string' },
          rollbackSql: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'completed', 'failed'] }
        },
        required: ['executionId', 'rollbackType', 'triggerReason', 'rollbackSql', 'status']
      }
    }
  }, async (request, reply) => {
    try {
      const body = request.body as RollbackInput;
      
      const result = await recordRollback(body);
      
      return reply.status(201).send({
        success: true,
        data: result
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to record rollback'
      });
    }
  });

  // GET /api/agent/status - Agent health and execution statistics
  fastify.get('/api/agent/status', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const status = await getAgentStatus(getLastAgentPollTime());
      return {
        success: true,
        data: status
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch agent status'
      });
    }
  });

  // GET /api/executions/:id/export - Export execution report
  fastify.get('/api/executions/:id/export', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['markdown', 'json'], default: 'markdown' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { format = 'markdown' } = request.query as { format?: string };
      
      const detail = await getExecutionWithRecommendations(id);
      
      if (!detail) {
        return reply.status(404).send({
          success: false,
          error: 'Execution not found'
        });
      }

      if (format === 'json') {
        const jsonReport = generateExecutionJsonReport(detail);
        reply.header('Content-Type', 'application/json');
        reply.header('Content-Disposition', `attachment; filename="execution-report-${id.substring(0, 8)}.json"`);
        return jsonReport;
      } else {
        const markdownReport = generateExecutionMarkdownReport(detail);
        reply.header('Content-Type', 'text/markdown; charset=utf-8');
        reply.header('Content-Disposition', `attachment; filename="execution-report-${id.substring(0, 8)}.md"`);
        return markdownReport;
      }
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to export execution report'
      });
    }
  });
}

// Helper functions for report generation
function generateExecutionJsonReport(detail: any): any {
  return {
    report_type: 'execution_report',
    generated_at: new Date().toISOString(),
    execution: {
      id: detail.id,
      status: detail.status,
      created_at: detail.createdAt,
      updated_at: detail.updatedAt
    },
    recommendations: detail.recommendations || [],
    summary: {
      total_recommendations: detail.recommendations?.length || 0,
      executed_ddls: (detail.recommendations || []).filter((r: any) => r.fix_options?.length > 0).length
    }
  };
}

function generateExecutionMarkdownReport(detail: any): string {
  const now = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  const recs = detail.recommendations || [];
  
  let md = `# 🔧 MySQL Execution Report\n\n`;
  md += `**Execution ID:** ${detail.id}\n`;
  md += `**Generated:** ${now}\n`;
  md += `**Status:** ${detail.status}\n\n`;
  md += `---\n\n`;

  // Summary
  md += `## 📊 Summary\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Recommendations | ${recs.length} |\n`;
  md += `| DDLs Executed | ${recs.filter((r: any) => r.fix_options?.length > 0).length} |\n\n`;

  // Executed DDLs
  if (recs.length > 0) {
    md += `## 🛠️ Executed Changes\n\n`;
    
    for (let i = 0; i < recs.length; i++) {
      const rec = recs[i];
      md += `### ${i + 1}. ${rec.title || rec.type}\n\n`;
      md += `- **Type:** ${rec.type}\n`;
      md += `- **Table:** ${rec.table_name || 'N/A'}\n`;
      md += `- **Severity:** ${rec.severity || 'medium'}\n\n`;
      
      if (rec.fix_options && rec.fix_options.length > 0) {
        const fix = rec.fix_options[0];
        md += `**DDL Executed:**\n\`\`\`sql\n${fix.implementation || 'N/A'}\n\`\`\`\n\n`;
        
        if (fix.rollback) {
          md += `**Rollback SQL:**\n\`\`\`sql\n${fix.rollback}\n\`\`\`\n\n`;
        }
        
        if (fix.estimated_impact) {
          md += `**Estimated Impact:** ${fix.estimated_impact}\n\n`;
        }
      }
    }
  }

  // Timeline (if available)
  md += `## 📅 Timeline\n\n`;
  md += `| Time | Event |\n`;
  md += `|------|-------|\n`;
  md += `| ${detail.createdAt || 'N/A'} | Execution Created |\n`;
  if (detail.updatedAt) {
    md += `| ${detail.updatedAt} | Status: ${detail.status} |\n`;
  }
  md += `\n`;

  // Footer
  md += `---\n\n`;
  md += `*Report generated by MySQL Optimizer*\n`;

  return md;
}