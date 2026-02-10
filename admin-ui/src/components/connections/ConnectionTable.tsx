import DataTable from '@/components/ui/DataTable';
import { Connection } from '@/lib/types';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import { ConnectionActions } from './ConnectionActions';

interface ConnectionTableProps {
  connections: Connection[];
  isLoading: boolean;
  onEditConnection?: (connection: Connection) => void;
}

export const ConnectionTable = ({
  connections,
  isLoading,
  onEditConnection,
}: ConnectionTableProps) => {
  const columns = [
    {
      key: 'name',
      title: 'Name',
      render: (_: unknown, row: Connection) => (
        <span className="font-medium text-slate-900">{row.name}</span>
      ),
    },
    {
      key: 'host',
      title: 'Host',
      render: (_: unknown, row: Connection) => (
        <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
          {row.host || '—'}:{row.port || 3306}
        </code>
      ),
    },
    {
      key: 'database',
      title: 'Database',
      render: (_: unknown, row: Connection) => (
        <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
          {row.database || row.databaseName || '—'}
        </code>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (_: unknown, row: Connection) => <ConnectionStatusBadge connection={row} />,
    },
    {
      key: 'updatedAt',
      title: 'Last Updated',
      render: (_: unknown, row: Connection) => (
        <span className="text-sm text-slate-500">
          {row.updatedAt ? new Date(row.updatedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '',
      align: 'right' as const,
      render: (_: unknown, row: Connection) => (
        <ConnectionActions connection={row} onEdit={onEditConnection} />
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={connections}
      loading={isLoading}
      emptyMessage="No connections found"
      emptyDescription="Add your first database connection to get started."
    />
  );
};
