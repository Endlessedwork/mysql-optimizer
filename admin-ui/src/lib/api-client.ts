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
  return apiFetch<Connection[]>('/api/connections')
}

export async function getConnection(id: string): Promise<ApiResponse<Connection>> {
  return apiFetch<Connection>(`/api/connections/${id}`)
}

export async function updateConnectionStatus(id: string, status: 'active' | 'disabled'): Promise<ApiResponse<void>> {
  return apiFetch<void>(`/api/connections/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function getRecommendations(connectionId?: string): Promise<ApiResponse<Recommendation[]>> {
  const params = connectionId ? `?connectionId=${connectionId}` : ''
  return apiFetch<Recommendation[]>(`/api/recommendations${params}`)
}

export async function getRecommendation(id: string): Promise<ApiResponse<RecommendationDetail>> {
  return apiFetch<RecommendationDetail>(`/api/recommendations/${id}`)
}

export async function approveRecommendation(id: string): Promise<ApiResponse<void>> {
  return apiFetch<void>(`/api/recommendations/${id}/approve`, {
    method: 'POST',
  })
}

export async function scheduleRecommendation(id: string, scheduledAt: string): Promise<ApiResponse<void>> {
  return apiFetch<void>(`/api/recommendations/${id}/schedule`, {
    method: 'POST',
    body: JSON.stringify({ scheduledAt }),
  })
}

export async function rejectRecommendation(id: string, reason?: string): Promise<ApiResponse<void>> {
  return apiFetch<void>(`/api/recommendations/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function getExecutions(connectionId?: string): Promise<ApiResponse<Execution[]>> {
  const params = connectionId ? `?connectionId=${connectionId}` : ''
  return apiFetch<Execution[]>(`/api/executions${params}`)
}

export async function getExecution(id: string): Promise<ApiResponse<ExecutionDetail>> {
  return apiFetch<ExecutionDetail>(`/api/executions/${id}`)
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
    return {
      data: response.data.connections ?? {},
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