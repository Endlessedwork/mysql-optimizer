import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { 
  getRecommendations, 
  getRecommendationById, 
  approveRecommendation, 
  scheduleRecommendation, 
  rejectRecommendation,
  createRecommendationPack,
  getRecommendationPackDetail,
  RecommendationPackInput
} from '../models/recommendations.model';

export default async function recommendationsRoutes(fastify: FastifyInstance) {
  // GET /api/recommendations - List recommendations (with filters)
  fastify.get('/api/recommendations', {
    preHandler: [authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          connectionId: { type: 'string' },
          status: { type: 'string' }
        }
      }
      // Response schema removed to allow all fields
    }
  }, async (request, reply) => {
    try {
      const { connectionId, status } = request.query as any;
      const recommendations = await getRecommendations({ connectionId, status });
      return {
        success: true,
        data: recommendations
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch recommendations'
      });
    }
  });

  // GET /api/recommendations/:id - Get recommendation detail with full data
  fastify.get('/api/recommendations/:id', {
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
      // Use getRecommendationPackDetail to get full recommendations array
      const detail = await getRecommendationPackDetail(id);
      
      if (!detail) {
        return reply.status(404).send({
          success: false,
          error: 'Recommendation not found'
        });
      }
      
      // Map Agent format to UI expected format
      const recs = detail.recommendations || [];
      const firstRec = recs[0] || {};
      
      // Extract table info from fix_options or evidence
      const fixOption = (firstRec.fix_options || [])[0] || {};
      const evidence = firstRec.evidence || {};
      const risk = firstRec.risk || {};
      const expectedGain = firstRec.expected_gain || {};
      
      return {
        success: true,
        data: {
          id: detail.id,
          connectionId: detail.connectionId || detail.scanRunId,
          connectionName: detail.connectionName,
          databaseName: detail.databaseName,
          status: detail.status,
          createdAt: detail.createdAt,
          updatedAt: detail.generatedAt,
          // Map to UI expected format
          title: firstRec.problem_statement || 'Database Optimization',
          description: fixOption.description || firstRec.problem_statement || 'No description',
          impact: firstRec.severity === 'high' ? 'high' : firstRec.severity === 'medium' ? 'medium' : 'low',
          sql: fixOption.implementation || '',
          executionPlan: JSON.stringify(evidence.explain_plan || {}, null, 2),
          metrics: {
            executionTime: evidence.metrics?.avg_time || 0,
            cpuUsage: 0,
            memoryUsage: 0,
            estimatedImprovement: expectedGain.performance_improvement || 0,
            tableSize: evidence.metrics?.rows_examined ? `~${evidence.metrics.rows_examined} rows` : 'N/A',
            affectedQueries: firstRec.blast_radius || 0
          },
          details: {
            tableName: (firstRec.referenced_objects || [])[0] || 'N/A',
            columns: evidence.metrics ? Object.keys(evidence.metrics) : [],
            indexType: 'btree',
            problemType: firstRec.problem_statement,
            severity: firstRec.severity,
            riskScore: risk.score || 0,
            confidence: risk.confidence || 0
          },
          // Include full data for advanced views
          rawRecommendations: recs,
          tradeOffs: firstRec.trade_offs,
          rollbackPlan: firstRec.rollback_plan,
          verificationPlan: firstRec.verification_plan
        }
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch recommendation'
      });
    }
  });

  // POST /api/recommendations/:id/approve - Approve recommendation
  fastify.post('/api/recommendations/:id/approve', {
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
      
      // ตรวจสอบว่า recommendation มีอยู่จริงหรือไม่
      const recommendation = await getRecommendationById(id);
      if (!recommendation) {
        return reply.status(404).send({
          success: false,
          error: 'Recommendation not found'
        });
      }
      
      // ตรวจสอบว่า status สามารถ approve ได้หรือไม่
      if (recommendation.status !== 'pending') {
        return reply.status(400).send({
          success: false,
          error: 'Recommendation is not in pending status'
        });
      }
      
      const result = await approveRecommendation(id);
      
      if (!result) {
        return reply.status(404).send({
          success: false,
          error: 'Failed to approve recommendation'
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
        error: 'Failed to approve recommendation'
      });
    }
  });

  // POST /api/recommendations/:id/schedule - Schedule recommendation
  fastify.post('/api/recommendations/:id/schedule', {
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
          scheduledAt: { type: 'string' },
          reason: { type: 'string' }
        },
        required: ['scheduledAt']
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
                status: { type: 'string' },
                scheduledAt: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { scheduledAt, reason } = request.body as { scheduledAt: string; reason?: string };
      
      // ตรวจสอบว่า recommendation มีอยู่จริงหรือไม่
      const recommendation = await getRecommendationById(id);
      if (!recommendation) {
        return reply.status(404).send({
          success: false,
          error: 'Recommendation not found'
        });
      }
      
      // ตรวจสอบว่า status สามารถ schedule ได้หรือไม่
      if (recommendation.status !== 'approved') {
        return reply.status(400).send({
          success: false,
          error: 'Recommendation is not in approved status'
        });
      }
      
      const result = await scheduleRecommendation(id, scheduledAt, reason);
      
      if (!result) {
        return reply.status(404).send({
          success: false,
          error: 'Failed to schedule recommendation'
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
        error: 'Failed to schedule recommendation'
      });
    }
  });

  // POST /api/recommendations/:id/reject - Reject recommendation
  fastify.post('/api/recommendations/:id/reject', {
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
          reason: { type: 'string' }
        }
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
      const { reason } = request.body as { reason?: string };
      
      // ตรวจสอบว่า recommendation มีอยู่จริงหรือไม่
      const recommendation = await getRecommendationById(id);
      if (!recommendation) {
        return reply.status(404).send({
          success: false,
          error: 'Recommendation not found'
        });
      }
      
      // ตรวจสอบว่า status สามารถ reject ได้หรือไม่
      if (!['pending', 'approved'].includes(recommendation.status)) {
        return reply.status(400).send({
          success: false,
          error: 'Recommendation is not in a valid status for rejection'
        });
      }
      
      const result = await rejectRecommendation(id, reason);
      
      if (!result) {
        return reply.status(404).send({
          success: false,
          error: 'Failed to reject recommendation'
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
        error: 'Failed to reject recommendation'
      });
    }
  });

  // POST /api/recommendations - Create a new recommendation pack (for Agent)
  fastify.post('/api/recommendations', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          scanRunId: { type: 'string' },
          recommendations: { type: 'array' }
        },
        required: ['scanRunId', 'recommendations']
      }
    }
  }, async (request, reply) => {
    try {
      const body = request.body as { scanRunId: string; recommendations: any[] };
      const tenantId = (request as any).tenantId || process.env.TENANT_ID;
      
      if (!tenantId) {
        return reply.status(400).send({
          success: false,
          error: 'Tenant ID is required'
        });
      }
      
      const input: RecommendationPackInput = {
        scanRunId: body.scanRunId,
        tenantId,
        recommendations: body.recommendations
      };
      
      const pack = await createRecommendationPack(input);
      
      return reply.status(201).send({
        success: true,
        data: pack
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to create recommendation pack'
      });
    }
  });

  // GET /api/recommendations/:id/detail - Get recommendation pack with full details
  fastify.get('/api/recommendations/:id/detail', {
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
      const detail = await getRecommendationPackDetail(id);
      
      if (!detail) {
        return reply.status(404).send({
          success: false,
          error: 'Recommendation pack not found'
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
        error: 'Failed to fetch recommendation pack detail'
      });
    }
  });

  // POST /api/recommendations/:id/execute-fix - Execute a single fix from a recommendation pack
  fastify.post('/api/recommendations/:id/execute-fix', {
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
          recommendationIndex: { type: 'number' },
          fixIndex: { type: 'number' },
          sql: { type: 'string' }
        },
        required: ['sql']
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { recommendationIndex = 0, fixIndex = 0, sql } = request.body as {
        recommendationIndex?: number;
        fixIndex?: number;
        sql: string;
      };

      // Validate SQL is not empty
      if (!sql || sql.trim() === '') {
        return reply.status(400).send({
          success: false,
          error: 'SQL statement is required'
        });
      }

      // Get recommendation pack detail
      const detail = await getRecommendationPackDetail(id);
      if (!detail) {
        return reply.status(404).send({
          success: false,
          error: 'Recommendation pack not found'
        });
      }

      // Check if connection profile exists
      if (!detail.connectionId) {
        return reply.status(400).send({
          success: false,
          error: 'Connection profile not found for this recommendation'
        });
      }

      // Create an execution record for this single fix
      const { createSingleFixExecution } = await import('../models/executions.model');
      const execution = await createSingleFixExecution({
        recommendationPackId: id,
        connectionId: detail.connectionId,
        recommendationIndex,
        fixIndex,
        sql,
        tenantId: detail.tenantId
      });

      return reply.status(201).send({
        success: true,
        data: execution,
        message: 'Fix execution queued. The agent will pick it up shortly.'
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to queue fix execution'
      });
    }
  });

  // GET /api/recommendations/:id/export - Export recommendation as Markdown report
  fastify.get('/api/recommendations/:id/export', {
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
          format: { type: 'string', enum: ['markdown', 'json'] }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { format = 'markdown' } = request.query as { format?: string };
      
      const detail = await getRecommendationPackDetail(id);
      
      if (!detail) {
        return reply.status(404).send({
          success: false,
          error: 'Recommendation pack not found'
        });
      }

      // Generate report based on format
      if (format === 'json') {
        // Return full JSON data for programmatic use
        const jsonReport = generateJsonReport(detail);
        reply.header('Content-Type', 'application/json');
        reply.header('Content-Disposition', `attachment; filename="optimization-report-${id.substring(0, 8)}.json"`);
        return jsonReport;
      } else {
        // Generate Markdown report
        const markdownReport = generateMarkdownReport(detail);
        reply.header('Content-Type', 'text/markdown; charset=utf-8');
        reply.header('Content-Disposition', `attachment; filename="optimization-report-${id.substring(0, 8)}.md"`);
        return markdownReport;
      }
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to export recommendation report'
      });
    }
  });
}

// Helper function to generate JSON report
function generateJsonReport(detail: any): any {
  const recs = detail.recommendations || [];
  
  return {
    report_id: detail.id,
    generated_at: new Date().toISOString(),
    scan_run_id: detail.scanRunId,
    status: detail.status,
    summary: {
      total_recommendations: recs.length,
      by_severity: {
        critical: recs.filter((r: any) => r.severity === 'critical').length,
        high: recs.filter((r: any) => r.severity === 'high').length,
        medium: recs.filter((r: any) => r.severity === 'medium').length,
        low: recs.filter((r: any) => r.severity === 'low').length,
      },
      by_type: recs.reduce((acc: any, r: any) => {
        acc[r.problem_statement] = (acc[r.problem_statement] || 0) + 1;
        return acc;
      }, {})
    },
    recommendations: recs.map((rec: any) => ({
      id: rec.id,
      type: rec.problem_statement,
      severity: rec.severity,
      table: rec.table,
      description: rec.fix_options?.[0]?.description,
      sql: rec.fix_options?.[0]?.implementation,
      rollback: rec.fix_options?.[0]?.rollback,
      evidence: rec.evidence,
      expected_gain: rec.expected_gain,
      risk: rec.risk,
      trade_offs: rec.trade_offs,
      verification_plan: rec.verification_plan
    })),
    action_items: recs
      .sort((a: any, b: any) => {
        const order: { [key: string]: number } = { critical: 4, high: 3, medium: 2, low: 1 };
        return (order[b.severity] || 0) - (order[a.severity] || 0);
      })
      .slice(0, 10)
      .map((rec: any, i: number) => ({
        priority: i + 1,
        action: rec.fix_options?.[0]?.description || rec.problem_statement,
        sql: rec.fix_options?.[0]?.implementation,
        severity: rec.severity
      }))
  };
}

// Helper function to generate Markdown report
function generateMarkdownReport(detail: any): string {
  const recs = detail.recommendations || [];
  const now = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  
  // Count by severity
  const critical = recs.filter((r: any) => r.severity === 'critical').length;
  const high = recs.filter((r: any) => r.severity === 'high').length;
  const medium = recs.filter((r: any) => r.severity === 'medium').length;
  const low = recs.filter((r: any) => r.severity === 'low').length;
  
  let md = `# 📊 MySQL Optimization Report\n\n`;
  md += `**Report ID:** ${detail.id}\n`;
  md += `**Generated:** ${now}\n`;
  md += `**Status:** ${detail.status}\n\n`;
  md += `---\n\n`;
  
  // Executive Summary
  md += `## 📋 สรุปผลการวิเคราะห์\n\n`;
  md += `พบปัญหาทั้งหมด **${recs.length} รายการ**\n\n`;
  
  if (critical > 0) md += `- ⚠️ **วิกฤต:** ${critical} รายการ\n`;
  if (high > 0) md += `- 🔴 **สูง:** ${high} รายการ\n`;
  if (medium > 0) md += `- 🟡 **ปานกลาง:** ${medium} รายการ\n`;
  if (low > 0) md += `- 🟢 **ต่ำ:** ${low} รายการ\n`;
  
  md += `\n---\n\n`;
  
  // Priority Actions
  md += `## 🎯 สิ่งที่ต้องดำเนินการ (เรียงตามความสำคัญ)\n\n`;
  
  const sortedRecs = [...recs].sort((a: any, b: any) => {
    const order: { [key: string]: number } = { critical: 4, high: 3, medium: 2, low: 1 };
    return (order[b.severity] || 0) - (order[a.severity] || 0);
  });
  
  for (let i = 0; i < Math.min(sortedRecs.length, 15); i++) {
    const rec = sortedRecs[i];
    const fixOption = rec.fix_options?.[0] || {};
    const evidence = rec.evidence?.metrics || rec.evidence || {};
    
    md += `### ${i + 1}. ${getTypeName(rec.problem_statement)}\n\n`;
    md += `**Severity:** ${getSeverityBadge(rec.severity)} | `;
    md += `**Table:** \`${rec.table || 'N/A'}\`\n\n`;
    
    if (fixOption.description) {
      md += `**ปัญหา:** ${fixOption.description}\n\n`;
    }
    
    // Evidence details
    if (Object.keys(evidence).length > 0) {
      md += `**หลักฐาน:**\n`;
      if (evidence.rows_examined) md += `- Rows Examined: ${formatNumber(evidence.rows_examined)}\n`;
      if (evidence.rows_sent) md += `- Rows Sent: ${formatNumber(evidence.rows_sent)}\n`;
      if (evidence.ratio) md += `- Examine/Sent Ratio: ${evidence.ratio}x\n`;
      if (evidence.efficiency) md += `- Efficiency: ${evidence.efficiency}\n`;
      if (evidence.avg_time_ms) md += `- Avg Time: ${evidence.avg_time_ms}ms\n`;
      if (evidence.execution_count) md += `- Execution Count: ${formatNumber(evidence.execution_count)}\n`;
      if (evidence.fragmentation_pct) md += `- Fragmentation: ${evidence.fragmentation_pct}%\n`;
      md += `\n`;
    }
    
    // SQL Solution
    if (fixOption.implementation) {
      md += `**SQL แก้ไข:**\n`;
      md += `\`\`\`sql\n${fixOption.implementation}\n\`\`\`\n\n`;
    }
    
    // Rollback
    if (fixOption.rollback) {
      md += `**Rollback:**\n`;
      md += `\`\`\`sql\n${fixOption.rollback}\n\`\`\`\n\n`;
    }
    
    // Expected improvement
    if (rec.expected_gain) {
      md += `**ผลที่คาดว่าจะได้:**\n`;
      if (rec.expected_gain.performance_improvement) {
        md += `- Performance: +${rec.expected_gain.performance_improvement}%\n`;
      }
      if (rec.expected_gain.description) {
        md += `- ${rec.expected_gain.description}\n`;
      }
      md += `\n`;
    }
    
    md += `---\n\n`;
  }
  
  // Analysis by Type
  md += `## 📈 วิเคราะห์ตามประเภทปัญหา\n\n`;
  
  const byType: { [key: string]: any[] } = {};
  for (const rec of recs) {
    const type = rec.problem_statement;
    if (!byType[type]) byType[type] = [];
    byType[type].push(rec);
  }
  
  for (const [type, items] of Object.entries(byType)) {
    md += `### ${getTypeName(type)}\n\n`;
    md += `พบ ${items.length} รายการ\n\n`;
    md += `| Table | Severity | Description |\n`;
    md += `|-------|----------|-------------|\n`;
    for (const item of items.slice(0, 10)) {
      const desc = item.fix_options?.[0]?.description || item.problem_statement;
      md += `| ${item.table || 'N/A'} | ${item.severity} | ${desc.substring(0, 50)}${desc.length > 50 ? '...' : ''} |\n`;
    }
    if (items.length > 10) {
      md += `| ... | ... | และอีก ${items.length - 10} รายการ |\n`;
    }
    md += `\n`;
  }
  
  md += `---\n\n`;
  
  // Risk & Safety
  md += `## ⚠️ คำแนะนำด้านความปลอดภัย\n\n`;
  md += `1. **ทดสอบก่อนใช้งานจริง** - รัน DDL ทั้งหมดใน staging/dev environment ก่อน\n`;
  md += `2. **เลือกเวลาที่เหมาะสม** - ดำเนินการในช่วง low traffic\n`;
  md += `3. **เตรียม rollback** - บันทึก DDL สำหรับ rollback ไว้เสมอ\n`;
  md += `4. **Monitor หลังการเปลี่ยนแปลง** - ตรวจสอบ performance หลังดำเนินการ\n`;
  md += `5. **ทำทีละขั้นตอน** - อย่าเปลี่ยนแปลงหลายอย่างพร้อมกัน\n\n`;
  
  md += `---\n\n`;
  md += `*Report generated by MySQL Optimizer*\n`;
  
  return md;
}

function getTypeName(type: string): string {
  const names: { [key: string]: string } = {
    'full_table_scan': '🔍 Full Table Scan',
    'filesort': '📊 Filesort',
    'filesort_temp_table': '📊 Filesort & Temporary Table',
    'temporary_table': '📝 Temporary Table',
    'high_rows_examined': '📈 High Rows Examined',
    'index_scan': '🔎 Index Scan',
    'where_without_index': '⚠️ WHERE Without Index',
    'table_fragmentation': '💾 Table Fragmentation',
    'unused_index': '🗑️ Unused Index',
    'slow_query': '🐢 Slow Query',
    'inefficient_query': '📉 Inefficient Query',
    'missing_index': '❌ Missing Index',
    'large_table': '📦 Large Table'
  };
  return names[type] || type;
}

function getSeverityBadge(severity: string): string {
  const badges: { [key: string]: string } = {
    'critical': '⚠️ CRITICAL',
    'high': '🔴 HIGH',
    'medium': '🟡 MEDIUM',
    'low': '🟢 LOW'
  };
  return badges[severity] || severity.toUpperCase();
}

function formatNumber(num: any): string {
  const n = parseInt(num);
  if (isNaN(n)) return String(num);
  return n.toLocaleString();
}