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
  fix_options?: Array<{
    id: string
    description: string
    implementation?: string
    rollback?: string
    estimated_impact?: string
  }>
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