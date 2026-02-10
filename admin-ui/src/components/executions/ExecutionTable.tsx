"use client";

import { DataTable } from '@/components/ui/DataTable';
import { Execution } from '@/lib/types';
import { ExecutionStatusBadge } from './ExecutionStatusBadge';
import { formatDate } from '@/lib/utils';
import { Database } from 'lucide-react';

interface ExecutionTableProps {
  executions: Execution[];
  connectionMap?: Record<string, string>;
  loading: boolean;
  onRowClick?: (execution: Execution) => void;
  onConnectionClick?: (connectionId: string, connectionName: string) => void;
}

export const ExecutionTable = ({ executions, connectionMap = {}, loading, onRowClick, onConnectionClick }: ExecutionTableProps) => {
  const columns = [
    {
      key: 'connectionId',
      title: 'Connection',
      render: (_: unknown, execution: Execution) => {
        // Use connectionName from API first, then fallback to connectionMap
        const connName = execution.connectionName || connectionMap[execution.connectionId];
        return (
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-400" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onConnectionClick && execution.connectionId) {
                  onConnectionClick(execution.connectionId, connName || 'Unknown');
                }
              }}
              className="font-medium text-slate-900 hover:text-teal-600 transition-colors cursor-pointer"
              title="Click to filter by this connection"
            >
              {connName || 'Unknown'}
            </button>
          </div>
        );
      },
    },
    {
      key: 'id',
      title: 'Execution ID',
      render: (_: unknown, execution: Execution) => (
        <span className="font-mono text-xs text-slate-500">{execution.id?.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (_: unknown, execution: Execution) => <ExecutionStatusBadge status={execution.status} />,
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: (_: unknown, execution: Execution) => formatDate(execution.createdAt),
    },
    {
      key: 'duration',
      title: 'Duration',
      render: (_: unknown, execution: Execution) => {
        if (!execution.updatedAt || !execution.createdAt) return 'N/A';
        if (execution.status === 'running' || execution.status === 'pending') return 'In Progress';
        const start = new Date(execution.createdAt);
        const end = new Date(execution.updatedAt);
        const diff = end.getTime() - start.getTime();
        if (diff < 1000) return '<1s';
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
      },
    },
    {
      key: 'verified',
      title: 'Verified',
      render: (_: unknown, execution: Execution) => {
        if (execution.status === 'completed') {
          return <span className="text-green-600">Yes</span>;
        }
        if (execution.status === 'failed') {
          return <span className="text-red-600">Failed</span>;
        }
        return <span className="text-gray-400">Pending</span>;
      },
    },
  ];

  return (
    <DataTable
      data={executions}
      columns={columns}
      loading={loading}
      onRowClick={onRowClick}
      emptyMessage="No executions found"
    />
  );
};