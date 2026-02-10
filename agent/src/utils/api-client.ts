import { Config } from '../config';

const config = new Config();

/**
 * Returns authentication headers for SaaS API calls.
 * All agent-to-API communication must include these headers.
 */
export function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-API-SECRET': config.apiKey,
    'X-Tenant-Id': process.env.TENANT_ID || '',
  };
}

/**
 * Base API URL from config
 */
function getApiUrl(): string {
  return config.apiUrl || process.env.SAAS_API_URL || 'http://localhost:3001';
}

/**
 * Generic API fetch function
 */
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${getApiUrl()}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorBody}`);
  }
  
  const json = await response.json() as any;
  return json.data ?? json;
}

// ============ Scan Run API ============

export interface ScanRun {
  id: string;
  tenantId: string;
  connectionProfileId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getScanRuns(filters: {
  connectionProfileId?: string;
  status?: 'pending' | 'running' | 'completed' | 'failed';
}): Promise<ScanRun[]> {
  const params = new URLSearchParams();
  if (filters.connectionProfileId) params.set('connectionProfileId', filters.connectionProfileId);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  return apiFetch<ScanRun[]>(`/api/scan-runs${qs ? `?${qs}` : ''}`);
}

export async function createScanRun(connectionProfileId: string): Promise<ScanRun> {
  return apiFetch<ScanRun>('/api/scan-runs', {
    method: 'POST',
    body: JSON.stringify({ connectionProfileId }),
  });
}

export async function updateScanRunStatus(
  scanRunId: string,
  status: 'pending' | 'running' | 'completed' | 'failed',
  errorMessage?: string
): Promise<ScanRun> {
  return apiFetch<ScanRun>(`/api/scan-runs/${scanRunId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, errorMessage }),
  });
}

export async function submitSchemaSnapshot(scanRunId: string, data: {
  tables?: any[];
  columns?: any[];
  indexes?: any[];
  views?: any[];
  procedures?: any[];
  functions?: any[];
  triggers?: any[];
  events?: any[];
  // Advanced statistics
  tableStats?: any[];
  indexUsage?: any[];
  indexCardinality?: any[];
  foreignKeys?: any[];
  lockStats?: any;
}): Promise<any> {
  return apiFetch<any>(`/api/scan-runs/${scanRunId}/schema-snapshot`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function submitQueryDigests(scanRunId: string, digests: any[]): Promise<any> {
  return apiFetch<any>(`/api/scan-runs/${scanRunId}/query-digests`, {
    method: 'POST',
    body: JSON.stringify({ digests }),
  });
}

// ============ Recommendations API ============

export async function submitRecommendations(scanRunId: string, recommendations: any[]): Promise<any> {
  return apiFetch<any>('/api/recommendations', {
    method: 'POST',
    body: JSON.stringify({ scanRunId, recommendations }),
  });
}

// ============ Executions API ============

export interface ScheduledExecution {
  id: string;
  approvalId: string;
  recommendationPackId: string;
  status: string;
}

export interface ExecutionDetail {
  id: string;
  approvalId: string;
  recommendationPackId: string;
  status: string;
  recommendations: {
    type: string;
    title: string;
    table_name: string;
    columns?: string[];
    index_name?: string;
    ddl?: string;
    rollback_sql?: string;
    severity: string;
    fix_options?: Array<{
      id: string;
      description: string;
      implementation: string;
      rollback: string;
      estimated_impact: string;
    }>;
  }[];
  connectionId?: string;
}

export async function getScheduledExecutions(): Promise<ScheduledExecution[]> {
  return apiFetch<ScheduledExecution[]>('/api/executions/scheduled');
}

export async function getExecutionDetail(executionId: string): Promise<ExecutionDetail> {
  return apiFetch<ExecutionDetail>(`/api/executions/${executionId}/detail`);
}

export async function claimExecution(executionId: string, agentId: string): Promise<any> {
  return apiFetch<any>(`/api/executions/${executionId}/claim`, {
    method: 'POST',
    body: JSON.stringify({ agentId }),
  });
}

export async function updateExecutionStatus(
  executionId: string,
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled',
  errorMessage?: string
): Promise<any> {
  return apiFetch<any>(`/api/executions/${executionId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, errorMessage }),
  });
}

export async function submitVerificationMetrics(
  executionId: string,
  beforeMetrics: any,
  afterMetrics: any
): Promise<any> {
  return apiFetch<any>('/api/verification-metrics', {
    method: 'POST',
    body: JSON.stringify({ executionId, beforeMetrics, afterMetrics }),
  });
}

export async function recordRollback(
  executionId: string,
  rollbackType: string,
  triggerReason: string,
  rollbackSql: string,
  status: 'pending' | 'completed' | 'failed'
): Promise<any> {
  return apiFetch<any>('/api/rollbacks', {
    method: 'POST',
    body: JSON.stringify({ executionId, rollbackType, triggerReason, rollbackSql, status }),
  });
}

// ============ Kill Switch API ============

export interface KillSwitchStatus {
  global: boolean;
  connections: { connectionId: string; enabled: boolean }[];
}

export async function getKillSwitchStatus(): Promise<KillSwitchStatus> {
  return apiFetch<KillSwitchStatus>('/api/kill-switch');
}

// ============ Connection API ============

export interface ConnectionCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
  databaseName: string | null;
}

export async function getConnectionCredentials(connectionId: string): Promise<ConnectionCredentials> {
  return apiFetch<ConnectionCredentials>(`/api/connections/${connectionId}/credentials`);
}
