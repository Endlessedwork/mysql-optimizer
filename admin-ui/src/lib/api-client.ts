import type {
  Connection,
  Recommendation,
  RecommendationDetail,
  Execution,
  ExecutionDetail,
  KillSwitchStatus,
  KillSwitchAuditLog,
  AuditLog,
  AuditLogFilters,
  ScanRun,
} from './types';

// Route through server-side proxy to keep API_SECRET off the client
// No secrets needed on client side - proxy handles authentication
const API_BASE_URL = ''

// Define API response type
interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
  ok: boolean;
}

// Helper function to make API requests with comprehensive error handling
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // Rewrite /api/xxx to /api/proxy/xxx so it goes through server-side proxy
  const proxyEndpoint = endpoint.replace(/^\/api\//, '/api/proxy/');
  const url = `${API_BASE_URL}${proxyEndpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      let errorMessage = 'Connection Error';

      if (response.status === 401 || response.status === 403) {
        errorMessage = 'Unauthorized';
      } else if (response.status === 404) {
        errorMessage = 'Not Found';
      } else if (response.status >= 500) {
        errorMessage = 'Server Error';
      }

      return {
        data: null,
        error: errorMessage,
        status: response.status,
        ok: false
      }
    }

    const body = await response.json()
    const data = body && typeof body === 'object' && 'data' in body ? body.data : body

    return {
      data: data as T,
      error: null,
      status: response.status,
      ok: true
    }
  } catch (error) {
    return {
      data: null,
      error: 'Connection Error',
      status: 0,
      ok: false
    }
  }
}

// Export functions:
export async function getConnections(): Promise<ApiResponse<Connection[]>> {
  const response = await apiFetch<any[]>('/api/connections')
  if (response.ok && response.data) {
    // Map API response to Connection type (databaseName -> database)
    response.data = response.data.map((conn: any) => ({
      ...conn,
      database: conn.databaseName || conn.database || '',
      databaseName: conn.databaseName || conn.database || '',
    }))
  }
  return response as ApiResponse<Connection[]>
}

export async function getConnection(id: string): Promise<ApiResponse<Connection>> {
  const response = await apiFetch<any>(`/api/connections/${id}`)
  if (response.ok && response.data) {
    response.data = {
      ...response.data,
      database: response.data.databaseName || response.data.database || '',
      databaseName: response.data.databaseName || response.data.database || '',
    }
  }
  return response as ApiResponse<Connection>
}

export async function updateConnectionStatus(id: string, status: 'active' | 'disabled'): Promise<ApiResponse<void>> {
  return apiFetch<void>(`/api/connections/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export interface CreateConnectionInput {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  databaseName?: string;
}

export interface ConnectionDetail extends Connection {
  host: string;
  port: number;
  username: string;
  databaseName: string | null;
  tenantId: string | null;
}

export async function createConnection(input: CreateConnectionInput): Promise<ApiResponse<ConnectionDetail>> {
  return apiFetch<ConnectionDetail>('/api/connections', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateConnection(id: string, input: Partial<CreateConnectionInput>): Promise<ApiResponse<ConnectionDetail>> {
  return apiFetch<ConnectionDetail>(`/api/connections/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function deleteConnection(id: string): Promise<ApiResponse<void>> {
  return apiFetch<void>(`/api/connections/${id}`, {
    method: 'DELETE',
  })
}

export async function testConnection(id: string): Promise<ApiResponse<{ connected: boolean; host: string; port: number }>> {
  return apiFetch<{ connected: boolean; host: string; port: number }>(`/api/connections/${id}/test`, {
    method: 'POST',
  })
}

/** Request a scan for this connection (creates pending scan run; agent will pick up when running) */
export async function requestConnectionScan(id: string): Promise<ApiResponse<{ id: string; connectionProfileId: string; status: string }>> {
  return apiFetch<{ id: string; connectionProfileId: string; status: string }>(`/api/connections/${id}/scan`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function testConnectionCredentials(credentials: Omit<CreateConnectionInput, 'name'>): Promise<ApiResponse<{ connected: boolean; host: string; port: number }>> {
  return apiFetch<{ connected: boolean; host: string; port: number }>('/api/connections/test', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export async function listDatabases(credentials: { host: string; port: number; username: string; password: string }): Promise<ApiResponse<{ databases: string[] }>> {
  return apiFetch<{ databases: string[] }>('/api/connections/databases', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export async function getConnectionDetail(id: string): Promise<ApiResponse<ConnectionDetail>> {
  return apiFetch<ConnectionDetail>(`/api/connections/${id}/detail`)
}

// Scan Runs API
export async function getScanRuns(filters?: { connectionProfileId?: string; status?: string }): Promise<ApiResponse<ScanRun[]>> {
  const params = new URLSearchParams();
  if (filters?.connectionProfileId) params.append('connectionProfileId', filters.connectionProfileId);
  if (filters?.status) params.append('status', filters.status);
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<ScanRun[]>(`/api/scan-runs${queryString}`)
}

export async function getScanRun(id: string): Promise<ApiResponse<ScanRun>> {
  return apiFetch<ScanRun>(`/api/scan-runs/${id}`)
}

export async function getRecommendations(connectionId?: string, status?: string, includeArchived?: boolean): Promise<ApiResponse<Recommendation[]>> {
  const params = new URLSearchParams();
  if (connectionId) params.append('connectionId', connectionId);
  if (status && status !== 'all') params.append('status', status);
  if (includeArchived) params.append('includeArchived', 'true');
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<Recommendation[]>(`/api/recommendations${queryString}`)
}

export async function getRecommendation(id: string): Promise<ApiResponse<RecommendationDetail>> {
  return apiFetch<RecommendationDetail>(`/api/recommendations/${id}`)
}

export async function rejectRecommendation(id: string, reason?: string): Promise<ApiResponse<void>> {
  return apiFetch<void>(`/api/recommendations/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function exportRecommendationReport(id: string, format: 'markdown' | 'json' = 'markdown'): Promise<void> {
  // Use fetch directly for file download
  const response = await fetch(`/api/proxy/recommendations/${id}/export?format=${format}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to export report');
  }
  
  // Get filename from Content-Disposition header
  const contentDisposition = response.headers.get('Content-Disposition');
  const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
  const filename = filenameMatch ? filenameMatch[1] : `optimization-report.${format === 'json' ? 'json' : 'md'}`;
  
  // Create blob and download
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function getRecommendationReportContent(id: string, format: 'markdown' | 'json' = 'markdown'): Promise<string> {
  const response = await fetch(`/api/proxy/recommendations/${id}/export?format=${format}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to get recommendation report');
  }
  
  return await response.text();
}

export async function getExecutions(connectionId?: string, status?: string): Promise<ApiResponse<Execution[]>> {
  const params = new URLSearchParams();
  if (connectionId) params.append('connectionId', connectionId);
  if (status && status !== 'all') params.append('status', status);
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<Execution[]>(`/api/executions${queryString}`)
}

export async function getExecution(id: string): Promise<ApiResponse<ExecutionDetail>> {
  return apiFetch<ExecutionDetail>(`/api/executions/${id}`)
}

export async function exportExecutionReport(id: string, format: 'markdown' | 'json' = 'markdown'): Promise<void> {
  const response = await fetch(`/api/proxy/executions/${id}/export?format=${format}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to export execution report');
  }
  
  const contentDisposition = response.headers.get('Content-Disposition');
  const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
  const filename = filenameMatch ? filenameMatch[1] : `execution-report-${id.substring(0, 8)}.${format === 'json' ? 'json' : 'md'}`;
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function getExecutionReportContent(id: string, format: 'markdown' | 'json' = 'markdown'): Promise<string> {
  const response = await fetch(`/api/proxy/executions/${id}/export?format=${format}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to get execution report');
  }
  
  return await response.text();
}

export async function getKillSwitchStatus(): Promise<ApiResponse<KillSwitchStatus>> {
  return apiFetch<KillSwitchStatus>('/api/kill-switch')
}

export async function getGlobalKillSwitchStatus(): Promise<ApiResponse<boolean>> {
  const response = await getKillSwitchStatus();
  if (response.ok && response.data) {
    return {
      data: response.data.global,
      error: null,
      status: response.status,
      ok: true
    };
  }
  return {
    data: null,
    error: response.error,
    status: response.status,
    ok: false
  };
}

export async function getConnectionKillSwitchStatuses(): Promise<ApiResponse<Record<string, boolean>>> {
  const response = await getKillSwitchStatus();
  if (response.ok && response.data) {
    const conn = response.data.connections;
    const record: Record<string, boolean> = {};
    if (Array.isArray(conn)) {
      conn.forEach((c: { connectionId: string; enabled: boolean }) => {
        record[c.connectionId] = c.enabled;
      });
    } else if (conn && typeof conn === 'object' && !Array.isArray(conn)) {
      Object.assign(record, conn);
    }
    return {
      data: record,
      error: null,
      status: response.status,
      ok: true
    };
  }
  return {
    data: null,
    error: response.error,
    status: response.status,
    ok: false
  };
}

export async function toggleKillSwitch(connectionId: string | 'global', enabled: boolean, reason: string): Promise<ApiResponse<void>> {
  if (connectionId === 'global') {
    return apiFetch<void>('/api/kill-switch/global/toggle', {
      method: 'POST',
      body: JSON.stringify({ enabled, reason }),
    })
  }
  return apiFetch<void>('/api/kill-switch/toggle', {
    method: 'POST',
    body: JSON.stringify({ connectionId, enabled, reason }),
  })
}

export async function getKillSwitchAuditLogs(): Promise<ApiResponse<KillSwitchAuditLog[]>> {
  return apiFetch<KillSwitchAuditLog[]>('/api/kill-switch/audit-logs')
}

export async function getAuditLogs(filters?: AuditLogFilters): Promise<ApiResponse<AuditLog[]>> {
  const params = new URLSearchParams()
  if (filters?.connectionId) params.append('connectionId', filters.connectionId)
  if (filters?.action) params.append('action', filters.action)
  if (filters?.userId) params.append('userId', filters.userId)

  const queryString = params.toString() ? `?${params.toString()}` : ''
  return apiFetch<AuditLog[]>(`/api/audit${queryString}`)
}

// Execute a single fix from a recommendation pack
export interface ExecuteSingleFixInput {
  recommendationPackId: string;
  recommendationIndex?: number;
  fixIndex?: number;
  sql: string;
}

export interface ExecuteSingleFixResult {
  id: string;
  recommendationPackId: string;
  connectionId: string;
  status: string;
  sql: string;
  createdAt: string;
}

export async function executeSingleFix(input: ExecuteSingleFixInput): Promise<ApiResponse<ExecuteSingleFixResult>> {
  return apiFetch<ExecuteSingleFixResult>(`/api/recommendations/${input.recommendationPackId}/execute-fix`, {
    method: 'POST',
    body: JSON.stringify({
      recommendationIndex: input.recommendationIndex || 0,
      fixIndex: input.fixIndex || 0,
      sql: input.sql
    }),
  })
}

// Execute a single step from a multi-step recommendation
export interface ExecuteStepInput {
  recommendationPackId: string;
  recommendationIndex: number;
  fixIndex: number;
  stepId: string;
  sql: string;
}

export interface ExecuteStepResult {
  id: string;
  stepId: string;
  status: string;
  evidence?: {
    collected_at: string;
    type: string;
    data: Record<string, any>;
  };
  error?: string;
}

export async function executeRecommendationStep(input: ExecuteStepInput): Promise<ApiResponse<ExecuteStepResult>> {
  return apiFetch<ExecuteStepResult>(`/api/recommendations/${input.recommendationPackId}/execute-step`, {
    method: 'POST',
    body: JSON.stringify({
      recommendationIndex: input.recommendationIndex,
      fixIndex: input.fixIndex,
      stepId: input.stepId,
      sql: input.sql
    }),
  })
}