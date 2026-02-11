// Connection type
export type Connection = {
  id: string
  name: string
  host: string
  port: number
  database: string
  databaseName?: string | null
  username: string
  status: 'active' | 'disabled'
  createdAt: string
  updatedAt: string
}

// Recommendation types
export type RecommendationStatus = 'pending' | 'approved' | 'scheduled' | 'executed' | 'failed' | 'rejected';

export type Recommendation = {
  id: string
  connectionId: string
  connectionName?: string
  databaseName?: string
  title: string
  description: string
  impact: 'low' | 'medium' | 'high'
  createdAt: string
  updatedAt: string
  status: RecommendationStatus
  // Dev-friendly summary stats
  totalCount?: number
  severityCounts?: {
    critical: number
    high: number
    medium: number
    low: number
  }
  topIssues?: Array<{ type: string; count: number }>
  affectedTablesCount?: number
  affectedTables?: string[]
}

// Multi-step recommendation types
export type StepType = 'explain_before' | 'execute_fix' | 'explain_after' | 'verify' | 'rollback';
export type StepStatus = 'pending' | 'ready' | 'in_progress' | 'completed' | 'skipped' | 'failed';

export type StepEvidence = {
  collected_at: string
  step_id: string
  type: 'explain_result' | 'execution_result' | 'verification_result'
  data: {
    explain_json?: Record<string, any>
    access_type?: string
    rows_examined?: number
    using_index?: boolean
    using_filesort?: boolean
    using_temporary?: boolean
    affected_rows?: number
    execution_time_ms?: number
    warnings?: string[]
    performance_change_percent?: number
    success?: boolean
    message?: string
  }
}

export type RecommendationStep = {
  id: string
  step_number: number
  step_type: StepType
  label: string
  description: string
  sql: string
  status: StepStatus
  requires_step_id?: string
  evidence?: StepEvidence
  estimated_time_sec?: number
  warning?: string
  started_at?: string
  completed_at?: string
}

export type FixOption = {
  id: string
  description: string
  implementation?: string
  rollback?: string
  estimated_impact?: string
  warning?: string
  // Multi-step fields
  is_multistep?: boolean
  total_steps?: number
  current_step?: number
  steps?: RecommendationStep[]
  roadmap?: {
    title: string
    summary: string
    steps_preview: string[]
  }
}

// Single recommendation item from agent
export type RawRecommendation = {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  problem_statement: string
  table?: string
  query?: string
  evidence?: {
    metrics?: {
      rows_examined?: number
      rows_sent?: number
      ratio?: string
      efficiency?: string
      avg_time_ms?: number
      total_time_ms?: number
      execution_count?: number
      fragmentation_pct?: number
    }
    impact_analysis?: {
      wasted_io?: string
      resource_waste?: number
      optimization_potential?: string
    }
  }
  fix_options?: FixOption[]
  expected_gain?: {
    performance_improvement?: number
    description?: string
    risk_reduction?: number
    resource_savings?: number
  }
  risk?: {
    level?: string
    score?: number
    confidence?: number
  }
  trade_offs?: {
    downtime?: string
    lock_risk?: string
    disk_usage?: string
    write_cost?: string
    maintenance?: string
  }
  verification_plan?: Array<{
    step: string
    command: string
    expected_result: string
  }>
  rollback_plan?: string
  blast_radius?: number
  referenced_objects?: string[]
  created_at?: string
}

export type RecommendationDetail = Recommendation & {
  sql: string
  executionPlan: string
  databaseName?: string
  metrics: {
    executionTime: number
    cpuUsage: number
    memoryUsage: number
    estimatedImprovement?: number
    queryImprovement?: number
    tableSize?: string
    affectedQueries?: number
    queriesAffected?: number
  }
  details?: {
    tableName?: string
    columns?: string[]
    indexType?: string
    problemType?: string
    severity?: string
    riskScore?: number
    confidence?: number
  }
  // Full raw recommendations array from agent
  rawRecommendations?: RawRecommendation[]
  tradeOffs?: Record<string, string>
  rollbackPlan?: string
  verificationPlan?: Array<{
    step: string
    command: string
    expected_result: string
  }>
}

// Execution types
export type Execution = {
  id: string
  recommendationId: string
  connectionId: string
  connectionName?: string
  databaseName?: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back'
  startedAt: string
  completedAt: string | null
  error: string | null
  createdAt?: string
  updatedAt?: string
}

export type ExecutionDetail = Execution & {
  logs: string[]
  metrics: {
    executionTime: number
    cpuUsage: number
    memoryUsage: number
  }
  baselineMetrics: {
    queryTime: number
    rowsExamined: number
    tableSize: number
  } | null
  afterMetrics: {
    queryTime: number
    rowsExamined: number
    tableSize: number
  } | null
  verificationResult: {
    status: 'pending' | 'pass' | 'fail'
    checkedAt: string
    details: string
  } | null
  rollbackInfo: {
    rolledBackAt: string
    reason: string
    rollbackDdl: string
    triggeredBy: 'auto' | 'manual'
  } | null
  // Detailed execution data
  executedDdls?: {
    ddl: string
    table_name: string
    type: string
    executed_at: string
    success: boolean
    rollback_sql?: string
  }[]
  timeline?: {
    timestamp: string
    event: string
    description?: string
    status?: 'success' | 'warning' | 'error' | 'info'
  }[]
  recommendations?: any[]
}

export type ExecutionFilter = {
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back'
  connectionId?: string
  startDate?: string
  endDate?: string
}

// Kill Switch types
export type KillSwitchStatus = {
  global: boolean
  connections: {
    [connectionId: string]: boolean
  }
}

export type KillSwitchTogglePayload = {
  connectionId: string | 'global'
  enabled: boolean
  reason: string
}

export type KillSwitchAuditLog = {
  id: string
  timestamp: string
  action: 'enabled' | 'disabled'
  scope: 'global' | 'connection'
  reason: string
  triggeredBy: string
  connectionId?: string
}

// Scan Run types
export type ScanRunStatus = 'pending' | 'running' | 'completed' | 'failed';

export type ScanRun = {
  id: string
  tenantId: string
  connectionProfileId: string
  connectionName?: string
  status: ScanRunStatus
  startedAt: string | null
  completedAt: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

// Audit Log types
export type AuditLog = {
  id: string
  userId: string
  action: string
  resource: string
  resourceId: string
  timestamp: string
  details: any
}

export type AuditLogFilters = {
  connectionId?: string
  action?: string
  userId?: string
}