import { useState, useEffect } from 'react';
import { 
  getKillSwitchStatus,
  getGlobalKillSwitchStatus,
  getConnectionKillSwitchStatuses,
  toggleKillSwitch,
  getKillSwitchAuditLogs
} from '@/lib/api-client';
import { KillSwitchStatus, KillSwitchAuditLog, KillSwitchTogglePayload } from '@/lib/types';

export const useKillSwitchStatus = () => {
  const [globalStatus, setGlobalStatus] = useState<boolean>(false);
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = () => setRefreshKey(prev => prev + 1);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const [globalResponse, connectionsResponse] = await Promise.all([
          getGlobalKillSwitchStatus(),
          getConnectionKillSwitchStatuses()
        ]);
        
        if (!globalResponse.ok) {
          throw new Error(globalResponse.error || 'Failed to fetch kill switch status');
        }
        
        if (!connectionsResponse.ok) {
          throw new Error(connectionsResponse.error || 'Failed to fetch kill switch status');
        }
        
        setGlobalStatus(globalResponse.data ?? false);
        setConnectionStatuses(connectionsResponse.data ?? {});
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch kill switch status');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [refreshKey]);

  return { globalStatus, connectionStatuses, loading, error, refetch };
};

export const useToggleKillSwitch = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (payload: KillSwitchTogglePayload) => {
    try {
      setLoading(true);
      setError(null);
      const response = await toggleKillSwitch(payload.connectionId, payload.enabled, payload.reason);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to toggle kill switch');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle kill switch');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { toggle, loading, error };
};

interface AuditLogResponse {
  logs: Array<{
    id: string;
    entityType: string;
    action: string;
    changes: { enabled?: boolean; reason?: string } | null;
    performedBy: string;
    createdAt: string;
  }>;
  total: number;
}

export const useKillSwitchAuditLogs = () => {
  const [data, setData] = useState<AuditLogResponse['logs']>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        setIsLoading(true);
        const response = await getKillSwitchAuditLogs();
        if (!response.ok) {
          throw new Error(response.error || 'Failed to fetch audit logs');
        }
        // API returns { logs: [...], total, limit, offset }
        const responseData = response.data as unknown as AuditLogResponse;
        setData(responseData?.logs || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuditLogs();
  }, []);

  return { data, isLoading, error };
};