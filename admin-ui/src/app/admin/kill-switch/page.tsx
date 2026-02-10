'use client';

import { useKillSwitchStatus, useKillSwitchAuditLogs } from '@/hooks/useKillSwitch';
import { useConnections } from '@/hooks/useConnections';
import GlobalKillSwitch from '@/components/kill-switch/GlobalKillSwitch';
import ConnectionKillSwitchList from '@/components/kill-switch/ConnectionKillSwitchList';
import KillSwitchAuditLog from '@/components/kill-switch/KillSwitchAuditLog';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Connection, KillSwitchAuditLog as AuditLogType } from '@/lib/types';
import { ShieldOff, AlertTriangle } from 'lucide-react';

const KillSwitchPage = () => {
  const { globalStatus, connectionStatuses, loading, error, refetch } = useKillSwitchStatus();
  const { data: connectionsData, isLoading: connectionsLoading } = useConnections();
  const { data: auditLogsData, isLoading: auditLoading } = useKillSwitchAuditLogs();

  // Transform connections data to match expected format
  const connections: Connection[] = (connectionsData || []).map((conn) => ({
    id: conn.id,
    name: conn.name,
    host: '',
    port: 3306,
    database: '',
    username: '',
    status: conn.status,
    createdAt: conn.createdAt,
    updatedAt: conn.updatedAt,
  }));

  // Transform audit logs to match expected format
  const auditLogs: AuditLogType[] = (auditLogsData || []).map((log) => ({
    id: log.id,
    timestamp: log.createdAt,
    action: log.action?.includes('enabled') ? 'enabled' : 'disabled',
    scope: log.action?.includes('global') ? 'global' : 'connection',
    reason: log.changes?.reason || 'No reason provided',
    triggeredBy: log.performedBy || 'system',
  }));

  const isLoading = loading || connectionsLoading || auditLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" label="Loading kill switch status..." />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<AlertTriangle className="w-7 h-7 text-red-500" />}
        title="Error loading kill switch"
        description={error}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Kill Switch Control</h1>
        <p className="text-sm text-slate-500 mt-1">
          Emergency controls to pause all optimization operations
        </p>
      </div>

      {/* Warning Banner */}
      {globalStatus && (
        <div className="flex items-center gap-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <ShieldOff className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="font-medium text-red-800">Global Kill Switch is Active</p>
            <p className="text-sm text-red-600">
              All automatic optimization operations are currently paused.
            </p>
          </div>
        </div>
      )}

      {/* Global Kill Switch */}
      <Card title="Global Kill Switch" subtitle="Pause all operations across all connections">
        {globalStatus !== undefined && (
          <GlobalKillSwitch status={globalStatus} onToggle={refetch} />
        )}
      </Card>

      {/* Per-Connection Kill Switches */}
      {connections.length > 0 && connectionStatuses && (
        <Card
          title="Connection Kill Switches"
          subtitle="Control operations for individual connections"
        >
          <ConnectionKillSwitchList
            connections={connections}
            connectionStatuses={connectionStatuses}
            onToggle={refetch}
          />
        </Card>
      )}

      {/* Audit Log */}
      <Card title="Audit Log" subtitle="History of kill switch actions">
        {auditLogs.length > 0 ? (
          <KillSwitchAuditLog auditLogs={auditLogs} />
        ) : (
          <div className="text-center py-8 text-slate-500">
            No audit log entries yet.
          </div>
        )}
      </Card>
    </div>
  );
};

export default KillSwitchPage;
