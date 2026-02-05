/**
 * Metrics Model for MySQL Production Optimizer
 * 
 * This model defines the structure for storing baseline and after metrics
 * for query performance and system-level metrics.
 */

// Base metrics structure for query performance
export interface QueryMetrics {
  // Query digest identifier
  query_digest: string;
  
  // Performance metrics
  count: number;
  total_latency: number;
  avg_latency: number;
  p95_latency?: number;
  rows_examined: number;
  rows_sent: number;
  tmp_tables: number;
  filesort: number;
  no_index_used: boolean;
  full_scan: boolean;
  
  // System-level metrics (optional)
  cpu_usage?: number;
  iowait?: number;
  disk_latency?: number;
  innodb_buffer_pool_hit_rate?: number;
  connections?: number;
}

// Extended metrics for specific actions like ADD INDEX
export interface IndexMetrics extends QueryMetrics {
  estimated_index_size?: number;
  ddl_duration?: number;
  lock_wait_time?: number;
  replication_lag?: number;
}

// Execution run model
export interface ExecutionRun {
  id: string;
  recommendation_id: string;
  execution_time: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  scheduled_time?: Date;
  actual_start_time?: Date;
  actual_end_time?: Date;
  metrics?: {
    baseline?: QueryMetrics;
    after?: QueryMetrics;
  };
  rollback_info?: {
    rollback_executed: boolean;
    rollback_time?: Date;
    rollback_reason?: string;
  };
}

// Metrics storage model
export interface MetricsStorage {
  id: string;
  execution_run_id: string;
  metric_type: 'baseline' | 'after';
  query_digest: string;
  metrics: QueryMetrics;
  recorded_at: Date;
  created_at: Date;
  updated_at: Date;
}

// Index metrics storage model
export interface IndexMetricsStorage extends MetricsStorage {
  metrics: IndexMetrics;
}