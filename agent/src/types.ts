export type ExecutionAction = 'ADD_INDEX';

export type ExecutionStatus = 'scheduled' | 'running' | 'completed' | 'failed' | 'rolled_back';

export type VerificationStatus = 'success' | 'failed' | 'inconclusive';

export interface ExecutionRun {
  id: string;
  connection_id: string;
  action: ExecutionAction;
  table_name: string;
  index_name: string;
  columns: string[];
  query_digests: string[];
  status: ExecutionStatus;
  created_at: Date;
  updated_at: Date;
  started_at?: Date;
  completed_at?: Date;
  error_message?: string;
  fail_reason?: 'out_of_scope' | 'kill_switch' | 'claim_failed' | 'execution_error' | 'verification_failed';
}

export interface QueryMetrics {
  digest: string;
  digest_text: string;
  count_star: number;
  avg_latency_ms: number;
  rows_examined: number;
  full_scan_count: number;
  sample_count: number;
}

export interface BaselineMetrics {
  timestamp: string;
  table_name: string;
  query_metrics: QueryMetrics[];
}

export interface AfterMetrics extends BaselineMetrics {
  window_minutes: 5 | 30;
}

export interface VerificationResult {
  status: VerificationStatus;
  message: string;
  metrics_comparison?: {
    avg_latency_change_percent: number;
    rows_examined_change_percent: number;
    full_scan_increased: boolean;
  };
  sample_count?: number;
}

export interface RollbackRecord {
  execution_run_id: string;
  rollback_type: 'auto' | 'manual';
  trigger_reason: string;
  rollback_sql: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: Date;
}

export interface AuditLogEntry {
  execution_run_id: string;
  action: string;
  old_status?: ExecutionStatus;
  new_status?: ExecutionStatus;
  details: Record<string, any>;
  timestamp: Date;
}