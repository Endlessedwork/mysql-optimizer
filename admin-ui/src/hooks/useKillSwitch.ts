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
  const [globalStatus, setGlobalStatus] = useState<KillSwitchStatus | null>(null);
  const [connectionStatuses, setConnectionStatuses] = useState<KillSwitchStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        
        setGlobalStatus({ global: globalResponse.data!, connections: connectionsResponse.data! });
        setConnectionStatuses(connectionsResponse.data!);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch kill switch status');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  return { globalStatus, connectionStatuses, loading, error };
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

export const useKillSwitchAuditLogs = () => {
  const [auditLogs, setAuditLogs] = useState<KillSwitchAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        setLoading(true);
        const response = await getKillSwitchAuditLogs();
        if (!response.ok) {
          throw new Error(response.error || 'Failed to fetch audit logs');
        }
        setAuditLogs(response.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLogs();
  }, []);

  return { auditLogs, loading, error };
};