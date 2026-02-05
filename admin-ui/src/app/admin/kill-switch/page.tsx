'use client';

import { useState, useEffect } from 'react';
import { useKillSwitchStatus } from '@/hooks/useKillSwitch';
import GlobalKillSwitch from '@/components/kill-switch/GlobalKillSwitch';
import ConnectionKillSwitchList from '@/components/kill-switch/ConnectionKillSwitchList';
import KillSwitchAuditLog from '@/components/kill-switch/KillSwitchAuditLog';
import { Connection } from '@/lib/types';

const KillSwitchPage = () => {
  const { globalStatus, connectionStatuses, loading, error } = useKillSwitchStatus();
  const [connections, setConnections] = useState<Connection[]>([]);

  useEffect(() => {
    // In a real implementation, this would fetch connections
    // For now, we'll mock some data
    setConnections([
      { id: 'conn-1', name: 'Production DB', host: 'prod-db.example.com', port: 3306, database: 'production', username: 'admin', status: 'active', createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
      { id: 'conn-2', name: 'Staging DB', host: 'staging-db.example.com', port: 3306, database: 'staging', username: 'admin', status: 'active', createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
      { id: 'conn-3', name: 'Development DB', host: 'dev-db.example.com', port: 3306, database: 'development', username: 'admin', status: 'active', createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
    ]);
  }, []);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Kill Switch Control Panel</h1>
      
      {globalStatus && (
        <GlobalKillSwitch status={globalStatus} />
      )}
      
      {connections.length > 0 && connectionStatuses && (
        <ConnectionKillSwitchList 
          connections={connections} 
          connectionStatuses={connectionStatuses} 
        />
      )}
      
      <KillSwitchAuditLog 
        auditLogs={[
          {
            id: 'log-1',
            timestamp: '2023-01-01T10:00:00Z',
            action: 'enabled',
            scope: 'global',
            reason: 'System maintenance',
            triggeredBy: 'admin-user'
          },
          {
            id: 'log-2',
            timestamp: '2023-01-01T11:00:00Z',
            action: 'disabled',
            scope: 'connection',
            reason: 'Maintenance completed',
            triggeredBy: 'admin-user'
          }
        ]} 
      />
    </div>
  );
};

export default KillSwitchPage;