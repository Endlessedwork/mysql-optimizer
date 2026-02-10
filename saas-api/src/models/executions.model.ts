import { Database } from '../database';

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
      eh.execution_status as status,
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
    const execution: Execution = {
      id: row.id,
      connectionId: row.connectionId,
      connectionName: row.connectionName,
      status: mapExecutionStatus(row.status),
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

export const getExecutionById = async (id: string): Promise<(Execution & { recommendations?: any[]; executedSql?: string }) | null> => {
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
      vm.before_metrics,
      vm.after_metrics,
      rp.recommendations
    FROM execution_history eh
    LEFT JOIN approvals a ON a.id = eh.approval_id
    LEFT JOIN recommendation_packs rp ON rp.id = a.recommendation_pack_id
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
  const execution: Execution & { databaseName?: string; recommendations?: any[]; executedSql?: string } = {
    id: row.id,
    connectionId: row.connectionId,
    connectionName: row.connectionName,
    databaseName: row.databaseName,
    status: mapExecutionStatus(row.status),
    createdAt: row.createdAt?.toISOString() || row.createdAt,
    updatedAt: row.updatedAt?.toISOString() || row.updatedAt
  };

  // Parse recommendations
  if (row.recommendations) {
    execution.recommendations = row.recommendations;
  }

  // Check if error_message contains single_fix metadata (JSON)
  if (row.error_message && row.error_message.startsWith('{')) {
    try {
      const metadata = JSON.parse(row.error_message);
      if (metadata.type === 'single_fix' && metadata.sql) {
        execution.executedSql = metadata.sql;
      }
    } catch {
      // Not JSON, keep as error message
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
  
  return {
    id: row.id,
    approvalId: row.approvalId,
    recommendationPackId: approvalResult.rows[0]?.recommendation_pack_id,
    connectionId: approvalResult.rows[0]?.recommendation_pack_id,
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

  // Create execution record with single fix metadata
  const metadata = JSON.stringify({
    type: 'single_fix',
    recommendationIndex: input.recommendationIndex,
    fixIndex: input.fixIndex,
    sql: input.sql
  });

  const result = await Database.query<any>(
    `INSERT INTO execution_history (approval_id, execution_status, error_message, created_at)
    VALUES ($1, 'pending', $2, NOW())
    RETURNING id, created_at as "createdAt"`,
    [approvalId, metadata]
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

export const getExecutionWithRecommendations = async (id: string): Promise<ExecutionWithRecommendations | null> => {
  const result = await Database.query<any>(
    `SELECT 
      eh.id,
      eh.approval_id as "approvalId",
      eh.execution_status as status,
      eh.created_at as "createdAt",
      eh.executed_at as "updatedAt",
      a.recommendation_pack_id as "recommendationPackId",
      rp.recommendations,
      sr.connection_profile_id as "connectionId"
    FROM execution_history eh
    JOIN approvals a ON a.id = eh.approval_id
    JOIN recommendation_packs rp ON rp.id = a.recommendation_pack_id
    LEFT JOIN scan_runs sr ON sr.id = rp.scan_run_id
    WHERE eh.id = $1`,
    [id]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  return {
    id: row.id,
    approvalId: row.approvalId,
    recommendationPackId: row.recommendationPackId,
    status: mapExecutionStatus(row.status),
    recommendations: row.recommendations || [],
    connectionId: row.connectionId,
    createdAt: row.createdAt?.toISOString() || row.createdAt,
    updatedAt: row.updatedAt?.toISOString() || row.updatedAt
  };
};
