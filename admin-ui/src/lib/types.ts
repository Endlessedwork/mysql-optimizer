// Connection type
export type Connection = {
  id: string
  name: string
  host: string
  port: number
  database: string
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
  title: string
  description: string
  impact: 'low' | 'medium' | 'high'
  createdAt: string
  updatedAt: string
  status: RecommendationStatus
}

export type RecommendationDetail = Recommendation & {
  sql: string
  executionPlan: string
  metrics: {
    executionTime: number
    cpuUsage: number
    memoryUsage: number
  }
}

// Execution types
export type Execution = {
  id: string
  recommendationId: string
  connectionId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back'
  startedAt: string
  completedAt: string | null
  error: string | null
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
  }
  afterMetrics: {
    queryTime: number
    rowsExamined: number
    tableSize: number
  }
  verificationResult: {
    status: 'pending' | 'pass' | 'fail'
    checkedAt: string
    details: string
  }
  rollbackInfo: {
    rolledBackAt: string
    reason: string
    rollbackDdl: string
    triggeredBy: 'auto' | 'manual'
  } | null
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