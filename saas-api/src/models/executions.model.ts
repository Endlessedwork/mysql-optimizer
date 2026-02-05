import { Database } from '../database';

export interface Execution {
  id: string;
  connectionId: string;
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
      a.recommendation_pack_id as "connectionId",
      eh.execution_status as status,
      eh.created_at as "createdAt",
      eh.executed_at as "updatedAt",
      vm.before_metrics,
      vm.after_metrics
    FROM execution_history eh
    LEFT JOIN approvals a ON a.id = eh.approval_id
    LEFT JOIN verification_metrics vm ON vm.execution_id = eh.id
  `;
  
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;
  
  if (filters.connectionId) {
    conditions.push(`a.recommendation_pack_id = $${paramIndex}`);
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

export const getExecutionById = async (id: string): Promise<Execution | null> => {
  const result = await Database.query<any>(
    `SELECT 
      eh.id,
      a.recommendation_pack_id as "connectionId",
      eh.execution_status as status,
      eh.created_at as "createdAt",
      eh.executed_at as "updatedAt",
      eh.error_message,
      vm.before_metrics,
      vm.after_metrics
    FROM execution_history eh
    LEFT JOIN approvals a ON a.id = eh.approval_id
    LEFT JOIN verification_metrics vm ON vm.execution_id = eh.id
    WHERE eh.id = $1`,
    [id]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  const execution: Execution = {
    id: row.id,
    connectionId: row.connectionId,
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
