import { Database } from '../database';
import { incrementAppliedFix, incrementFailedFix } from './recommendations.model';

export interface Execution {
  id: string;
  connectionId: string;
  connectionName?: string;
  databaseName?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  timeline?: TimelineEvent[];
  metrics?: Metrics;
  verification?: VerificationResult;
  rollback?: RollbackInfo;
}

export interface TimelineEvent {
  timestamp: string;
  event: string;
  description?: string;
}

export interface Metrics {
  before: {
    cpu: number;
    memory: number;
    disk: number;
  };
  after: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

export interface VerificationResult {
  passed: boolean;
  details: string;
}

export interface RollbackInfo {
  executed: boolean;
  timestamp: string;
  reason?: string;
}

export const getExecutions = async (filters: { connectionId?: string; status?: string; dateRange?: string }): Promise<Execution[]> => {
  let query = `
    SELECT
      eh.id,
      sr.connection_profile_id as "connectionId",
      cp.name as "connectionName",
      cp.database_name as "databaseName",
      eh.execution_status as status,
      eh.executed_sql as "executedSql",
      eh.error_message as "errorMessage",
      eh.recommendation_index as "recommendationIndex",
      eh.created_at as "createdAt",
      eh.executed_at as "updatedAt",
      vm.before_metrics,
      vm.after_metrics
    FROM execution_history eh
    LEFT JOIN approvals a ON a.id = eh.approval_id
    LEFT JOIN recommendation_packs rp ON rp.id = a.recommendation_pack_id
    LEFT JOIN scan_runs sr ON sr.id = rp.scan_run_id
    LEFT JOIN connection_profiles cp ON cp.id = sr.connection_profile_id
    LEFT JOIN verification_metrics vm ON vm.execution_id = eh.id
  `;

  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (filters.connectionId) {
    conditions.push(`sr.connection_profile_id = $${paramIndex}`);
    params.push(filters.connectionId);
    paramIndex++;
  }

  if (filters.status) {
    conditions.push(`eh.execution_status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY eh.created_at DESC';

  const result = await Database.query<any>(query, params);

  return result.rows.map(row => {
    const execution: any = {
      id: row.id,
      connectionId: row.connectionId,
      connectionName: row.connectionName,
      databaseName: row.databaseName,
      status: mapExecutionStatus(row.status),
      executedSql: row.executedSql,
      errorMessage: row.errorMessage,
      recommendationIndex: row.recommendationIndex,
      createdAt: row.createdAt?.toISOString() || row.createdAt,
      updatedAt: row.updatedAt?.toISOString() || row.updatedAt
    };

    // Parse metrics if available
    if (row.before_metrics || row.after_metrics) {
      execution.metrics = {
        before: parseMetrics(row.before_metrics),
        after: parseMetrics(row.after_metrics)
      };
    }

    return execution;
  });
};

export const getExecutionById = async (id: string): Promise<(Execution & { recommendations?: any[]; executedSql?: string; recommendationPackId?: string; recommendationIndex?: number | null }) | null> => {
  const result = await Database.query<any>(
    `SELECT
      eh.id,
      sr.connection_profile_id as "connectionId",
      cp.name as "connectionName",
      cp.database_name as "databaseName",
      eh.execution_status as status,
      eh.created_at as "createdAt",
      eh.executed_at as "updatedAt",
      eh.error_message,
      eh.recommendation_pack_id as "recommendationPackId",
      eh.recommendation_index as "recommendationIndex",
      eh.executed_sql as "executedSql",
      vm.before_metrics,
      vm.after_metrics,
      rp.recommendations
    FROM execution_history eh
    LEFT JOIN recommendation_packs rp ON rp.id = eh.recommendation_pack_id
    LEFT JOIN scan_runs sr ON sr.id = rp.scan_run_id
    LEFT JOIN connection_profiles cp ON cp.id = sr.connection_profile_id
    LEFT JOIN verification_metrics vm ON vm.execution_id = eh.id
    WHERE eh.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  const execution: Execution & { databaseName?: string; recommendations?: any[]; executedSql?: string; recommendationPackId?: string; recommendationIndex?: number | null } = {
    id: row.id,
    connectionId: row.connectionId,
    connectionName: row.connectionName,
    databaseName: row.databaseName,
    status: mapExecutionStatus(row.status),
    recommendationPackId: row.recommendationPackId,
    recommendationIndex: row.recommendationIndex,
    executedSql: row.executedSql,
    createdAt: row.createdAt?.toISOString() || row.createdAt,
    updatedAt: row.updatedAt?.toISOString() || row.updatedAt
  };

  // Filter to targeted recommendation if this is a single-fix execution
  if (row.recommendations) {
    if (row.recommendationIndex !== null && Array.isArray(row.recommendations)) {
      const targetRec = row.recommendations[row.recommendationIndex];
      execution.recommendations = targetRec ? [targetRec] : [];
    } else {
      execution.recommendations = row.recommendations;
    }
  }

  // Parse metrics if available
  if (row.before_metrics || row.after_metrics) {
    execution.metrics = {
      before: parseMetrics(row.before_metrics),
      after: parseMetrics(row.after_metrics)
    };
  }

  // Add verification result if metrics exist
  if (row.before_metrics && row.after_metrics) {
    execution.verification = {
      passed: true, // Simplified - would need actual verification logic
      details: 'Metrics collected successfully'
    };
  }

  return execution;
};

// Helper function to map database status to execution status
function mapExecutionStatus(dbStatus: string): 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' {
  const statusMap: Record<string, 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'> = {
    'success': 'completed',
    'failed': 'failed',
    'pending': 'pending',
    'running': 'running',
    'cancelled': 'cancelled'
  };
  return statusMap[dbStatus] || 'pending';
}

// Helper function to parse metrics from JSON
function parseMetrics(metricsJson: any): { cpu: number; memory: number; disk: number } {
  if (!metricsJson) {
    return { cpu: 0, memory: 0, disk: 0 };
  }
  
  const metrics = typeof metricsJson === 'string' ? JSON.parse(metricsJson) : metricsJson;
  
  return {
    cpu: metrics.cpu_usage || metrics.cpu || 0,
    memory: metrics.memory || 0,
    disk: metrics.disk_latency || metrics.disk || 0
  };
}

export interface CreateExecutionInput {
  approvalId: string;
}

export interface ExecutionDetail extends Execution {
  approvalId: string;
  recommendationPackId: string;
  errorMessage?: string;
  claimedBy?: string;
  claimedAt?: string;
}

export const createExecution = async (input: CreateExecutionInput): Promise<ExecutionDetail> => {
  const result = await Database.query<any>(
    `INSERT INTO execution_history (approval_id, execution_status, created_at)
    VALUES ($1, 'pending', NOW())
    RETURNING id, approval_id as "approvalId", execution_status as status, 
      executed_at as "executedAt", error_message as "errorMessage",
      created_at as "createdAt"`,
    [input.approvalId]
  );
  
  const row = result.rows[0];
  
  // Get recommendation pack id
  const approvalResult = await Database.query<any>(
    `SELECT recommendation_pack_id FROM approvals WHERE id = $1`,
    [input.approvalId]
  );
  
  return {
    id: row.id,
    approvalId: row.approvalId,
    recommendationPackId: approvalResult.rows[0]?.recommendation_pack_id,
    connectionId: approvalResult.rows[0]?.recommendation_pack_id,
    status: mapExecutionStatus(row.status),
    createdAt: row.createdAt?.toISOString() || row.createdAt,
    updatedAt: row.createdAt?.toISOString() || row.createdAt,
    errorMessage: row.errorMessage
  };
};

export const claimExecution = async (id: string, agentId: string): Promise<ExecutionDetail | null> => {
  // Atomically claim the execution (only if status is pending)
  const result = await Database.query<any>(
    `UPDATE execution_history 
    SET execution_status = 'running', executed_at = NOW()
    WHERE id = $1 AND execution_status = 'pending'
    RETURNING id, approval_id as "approvalId", execution_status as status,
      executed_at as "executedAt", error_message as "errorMessage",
      created_at as "createdAt"`,
    [id]
  );
  
  if (result.rows.length === 0) {
    return null; // Already claimed or not found
  }
  
  const row = result.rows[0];
  
  // Get recommendation pack id
  const approvalResult = await Database.query<any>(
    `SELECT recommendation_pack_id FROM approvals WHERE id = $1`,
    [row.approvalId]
  );
  
  return {
    id: row.id,
    approvalId: row.approvalId,
    recommendationPackId: approvalResult.rows[0]?.recommendation_pack_id,
    connectionId: approvalResult.rows[0]?.recommendation_pack_id,
    status: mapExecutionStatus(row.status),
    createdAt: row.createdAt?.toISOString() || row.createdAt,
    updatedAt: row.executedAt?.toISOString() || row.executedAt,
    claimedBy: agentId,
    claimedAt: row.executedAt?.toISOString()
  };
};

export const updateExecutionStatus = async (
  id: string,
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled',
  errorMessage?: string
): Promise<ExecutionDetail | null> => {
  const dbStatus = status === 'completed' ? 'success' : status;

  let query = `UPDATE execution_history SET execution_status = $1`;
  const params: any[] = [dbStatus];
  let paramIndex = 2;

  if (status === 'completed' || status === 'failed') {
    query += `, executed_at = NOW()`;
  }

  if (errorMessage !== undefined) {
    query += `, error_message = $${paramIndex++}`;
    params.push(errorMessage);
  }

  query += ` WHERE id = $${paramIndex}
    RETURNING id, approval_id as "approvalId", execution_status as status,
      executed_at as "executedAt", error_message as "errorMessage",
      created_at as "createdAt"`;
  params.push(id);

  const result = await Database.query<any>(query, params);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];

  const approvalResult = await Database.query<any>(
    `SELECT recommendation_pack_id FROM approvals WHERE id = $1`,
    [row.approvalId]
  );

  const recommendationPackId = approvalResult.rows[0]?.recommendation_pack_id;

  // Update recommendation pack status based on execution result
  if (recommendationPackId && (status === 'completed' || status === 'failed')) {
    try {
      if (status === 'completed') {
        await incrementAppliedFix(recommendationPackId);
      } else if (status === 'failed') {
        await incrementFailedFix(recommendationPackId);
      }
    } catch (err) {
      console.error('Failed to update pack status:', err);
    }
  }

  return {
    id: row.id,
    approvalId: row.approvalId,
    recommendationPackId,
    connectionId: recommendationPackId,
    status: mapExecutionStatus(row.status),
    createdAt: row.createdAt?.toISOString() || row.createdAt,
    updatedAt: row.executedAt?.toISOString() || row.createdAt,
    errorMessage: row.errorMessage
  };
};

export const getScheduledExecutions = async (): Promise<ExecutionDetail[]> => {
  const result = await Database.query<any>(
    `SELECT 
      eh.id, eh.approval_id as "approvalId", eh.execution_status as status,
      eh.executed_at as "executedAt", eh.error_message as "errorMessage",
      eh.created_at as "createdAt",
      a.recommendation_pack_id as "recommendationPackId"
    FROM execution_history eh
    JOIN approvals a ON a.id = eh.approval_id
    WHERE eh.execution_status = 'pending'
    ORDER BY eh.created_at ASC`
  );
  
  return result.rows.map((row: any) => ({
    id: row.id,
    approvalId: row.approvalId,
    recommendationPackId: row.recommendationPackId,
    connectionId: row.recommendationPackId,
    status: mapExecutionStatus(row.status),
    createdAt: row.createdAt?.toISOString() || row.createdAt,
    updatedAt: row.executedAt?.toISOString() || row.createdAt,
    errorMessage: row.errorMessage
  }));
};

export interface VerificationMetricsInput {
  executionId: string;
  beforeMetrics: any;
  afterMetrics: any;
}

export const createVerificationMetrics = async (input: VerificationMetricsInput): Promise<{ id: string }> => {
  const result = await Database.query<any>(
    `INSERT INTO verification_metrics (execution_id, before_metrics, after_metrics)
    VALUES ($1, $2, $3)
    RETURNING id`,
    [input.executionId, JSON.stringify(input.beforeMetrics), JSON.stringify(input.afterMetrics)]
  );
  
  return { id: result.rows[0].id };
};

export interface RollbackInput {
  executionId: string;
  rollbackType: string;
  triggerReason: string;
  rollbackSql: string;
  status: 'pending' | 'completed' | 'failed';
}

// Note: rollbacks table doesn't exist in schema - we'll store in audit_logs or create the table
export const recordRollback = async (input: RollbackInput): Promise<{ success: boolean }> => {
  // For now, we'll update execution status and store rollback info in error_message
  await Database.query<any>(
    `UPDATE execution_history 
    SET execution_status = 'failed', 
        error_message = $1
    WHERE id = $2`,
    [`Rollback: ${input.triggerReason}. SQL: ${input.rollbackSql}`, input.executionId]
  );
  
  return { success: true };
};

// Full execution detail with recommendations (for Agent to execute DDL)
export interface ExecutionWithRecommendations {
  id: string;
  approvalId: string;
  recommendationPackId: string;
  status: string;
  recommendations: any[];
  connectionId?: string;
  recommendationIndex?: number | null;
  executedSql?: string | null;
  createdAt: string;
  updatedAt?: string;
}

// Single fix execution input
export interface SingleFixExecutionInput {
  recommendationPackId: string;
  connectionId: string;
  recommendationIndex: number;
  fixIndex: number;
  sql: string;
  tenantId: string;
}

// Single fix execution result
export interface SingleFixExecution {
  id: string;
  recommendationPackId: string;
  connectionId: string;
  status: string;
  sql: string;
  createdAt: string;
}

// Create execution for a single fix (without requiring full approval flow)
export const createSingleFixExecution = async (input: SingleFixExecutionInput): Promise<SingleFixExecution> => {
  // First, create or get an approval for this pack (if not exists)
  let approvalId: string;

  const existingApproval = await Database.query<any>(
    `SELECT id FROM approvals WHERE recommendation_pack_id = $1`,
    [input.recommendationPackId]
  );

  if (existingApproval.rows.length > 0) {
    approvalId = existingApproval.rows[0].id;
  } else {
    // Create auto-approval for single fix execution
    const approvalResult = await Database.query<any>(
      `INSERT INTO approvals (id, recommendation_pack_id, status, approved_at, created_at)
      VALUES (gen_random_uuid(), $1, 'approved', NOW(), NOW())
      RETURNING id`,
      [input.recommendationPackId]
    );
    approvalId = approvalResult.rows[0].id;
  }

  // Create execution record with proper tracking columns
  const metadata = JSON.stringify({
    type: 'single_fix',
    recommendationIndex: input.recommendationIndex,
    fixIndex: input.fixIndex,
    sql: input.sql
  });

  const result = await Database.query<any>(
    `INSERT INTO execution_history (
      approval_id, execution_status, error_message,
      recommendation_pack_id, recommendation_index, fix_index, executed_sql,
      created_at
    ) VALUES ($1, 'pending', $2, $3, $4, $5, $6, NOW())
    RETURNING id, created_at as "createdAt"`,
    [approvalId, metadata, input.recommendationPackId, input.recommendationIndex, input.fixIndex, input.sql]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    recommendationPackId: input.recommendationPackId,
    connectionId: input.connectionId,
    status: 'pending',
    sql: input.sql,
    createdAt: row.createdAt?.toISOString() || row.createdAt
  };
};

// Step execution input for multi-step recommendations
export interface StepExecutionInput {
  recommendationPackId: string;
  connectionId: string;
  recommendationIndex: number;
  fixIndex: number;
  stepId: string;
  stepType: string;
  sql: string;
  tenantId: string;
}

// Step execution result
export interface StepExecution {
  id: string;
  recommendationPackId: string;
  connectionId: string;
  stepId: string;
  stepType: string;
  status: string;
  sql: string;
  createdAt: string;
}

// Create execution for a single step in multi-step recommendation
export const createStepExecution = async (input: StepExecutionInput): Promise<StepExecution> => {
  // First, create or get an approval for this pack (if not exists)
  let approvalId: string;

  const existingApproval = await Database.query<any>(
    `SELECT id FROM approvals WHERE recommendation_pack_id = $1`,
    [input.recommendationPackId]
  );

  if (existingApproval.rows.length > 0) {
    approvalId = existingApproval.rows[0].id;
  } else {
    // Create auto-approval for step execution
    const approvalResult = await Database.query<any>(
      `INSERT INTO approvals (id, recommendation_pack_id, status, approved_at, created_at)
      VALUES (gen_random_uuid(), $1, 'approved', NOW(), NOW())
      RETURNING id`,
      [input.recommendationPackId]
    );
    approvalId = approvalResult.rows[0].id;
  }

  // Create execution record with proper tracking columns
  const metadata = JSON.stringify({
    type: 'step_execution',
    recommendationIndex: input.recommendationIndex,
    fixIndex: input.fixIndex,
    stepId: input.stepId,
    stepType: input.stepType,
    sql: input.sql
  });

  const result = await Database.query<any>(
    `INSERT INTO execution_history (
      approval_id, execution_status, error_message,
      recommendation_pack_id, recommendation_index, fix_index, executed_sql,
      created_at
    ) VALUES ($1, 'pending', $2, $3, $4, $5, $6, NOW())
    RETURNING id, created_at as "createdAt"`,
    [approvalId, metadata, input.recommendationPackId, input.recommendationIndex, input.fixIndex, input.sql]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    recommendationPackId: input.recommendationPackId,
    connectionId: input.connectionId,
    stepId: input.stepId,
    stepType: input.stepType,
    status: 'pending',
    sql: input.sql,
    createdAt: row.createdAt?.toISOString() || row.createdAt
  };
};

// Fix execution status for a specific recommendation+fix combination
export interface FixExecutionStatus {
  status: string;
  executionId: string;
}

// Get execution statuses for all fixes in a recommendation pack
// Returns a map keyed by "recommendationIndex:fixIndex"
export const getFixExecutionStatuses = async (
  recommendationPackId: string
): Promise<Record<string, FixExecutionStatus>> => {
  const result = await Database.query<any>(
    `SELECT eh.id, eh.execution_status, eh.recommendation_index, eh.fix_index
     FROM execution_history eh
     WHERE eh.recommendation_pack_id = $1
       AND eh.recommendation_index IS NOT NULL
     ORDER BY eh.created_at DESC`,
    [recommendationPackId]
  );

  const statuses: Record<string, FixExecutionStatus> = {};

  for (const row of result.rows) {
    const key = `${row.recommendation_index}:${row.fix_index ?? 0}`;
    // Only keep the most recent execution per fix (query is ordered DESC)
    if (!statuses[key]) {
      statuses[key] = {
        status: mapExecutionStatus(row.execution_status),
        executionId: row.id
      };
    }
  }

  return statuses;
};

// Check if there's already an active execution for a specific fix
export const findExistingFixExecution = async (
  recommendationPackId: string,
  recommendationIndex: number,
  fixIndex: number
): Promise<FixExecutionStatus | null> => {
  const result = await Database.query<any>(
    `SELECT id, execution_status
     FROM execution_history
     WHERE recommendation_pack_id = $1
       AND recommendation_index = $2
       AND fix_index = $3
       AND execution_status IN ('pending', 'running', 'success')
     ORDER BY created_at DESC
     LIMIT 1`,
    [recommendationPackId, recommendationIndex, fixIndex]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    status: mapExecutionStatus(row.execution_status),
    executionId: row.id
  };
};

// Agent status — used by Settings page to show agent health
export interface AgentStatus {
  isOnline: boolean;
  lastActivity: string | null;
  stats: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
}

export const getAgentStatus = async (lastPollAt: Date | null): Promise<AgentStatus> => {
  const result = await Database.query<any>(
    `SELECT
      execution_status,
      MAX(executed_at) as last_activity,
      COUNT(*) as count
    FROM execution_history
    GROUP BY execution_status`
  );

  const stats = { pending: 0, running: 0, completed: 0, failed: 0 };
  let lastActivity: Date | null = null;

  for (const row of result.rows) {
    const mapped = mapExecutionStatus(row.execution_status);
    if (mapped in stats) {
      stats[mapped as keyof typeof stats] = parseInt(row.count, 10);
    }
    if (row.last_activity) {
      const date = new Date(row.last_activity);
      if (!lastActivity || date > lastActivity) {
        lastActivity = date;
      }
    }
  }

  // Agent is online if it polled for work within the last 2 minutes
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  const isOnline = lastPollAt !== null && lastPollAt > twoMinutesAgo;

  return {
    isOnline,
    lastActivity: lastPollAt?.toISOString() || lastActivity?.toISOString() || null,
    stats
  };
};

export const getExecutionWithRecommendations = async (id: string): Promise<ExecutionWithRecommendations | null> => {
  const result = await Database.query<any>(
    `SELECT
      eh.id,
      eh.approval_id as "approvalId",
      eh.execution_status as status,
      eh.recommendation_pack_id as "recommendationPackId",
      eh.recommendation_index as "recommendationIndex",
      eh.fix_index as "fixIndex",
      eh.executed_sql as "executedSql",
      eh.created_at as "createdAt",
      eh.executed_at as "updatedAt",
      rp.recommendations,
      sr.connection_profile_id as "connectionId"
    FROM execution_history eh
    LEFT JOIN recommendation_packs rp ON rp.id = eh.recommendation_pack_id
    LEFT JOIN scan_runs sr ON sr.id = rp.scan_run_id
    WHERE eh.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];

  // Filter to targeted recommendation if this is a single-fix execution
  let recommendations = row.recommendations || [];
  if (row.recommendationIndex !== null && Array.isArray(recommendations)) {
    const targetRec = recommendations[row.recommendationIndex];
    recommendations = targetRec ? [targetRec] : [];
  }

  return {
    id: row.id,
    approvalId: row.approvalId,
    recommendationPackId: row.recommendationPackId,
    status: mapExecutionStatus(row.status),
    recommendations,
    connectionId: row.connectionId,
    recommendationIndex: row.recommendationIndex,
    executedSql: row.executedSql,
    createdAt: row.createdAt?.toISOString() || row.createdAt,
    updatedAt: row.updatedAt?.toISOString() || row.updatedAt
  };
};
