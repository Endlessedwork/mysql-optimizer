import DataTable from '@/components/ui/DataTable';
import { Connection } from '@/lib/types';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import { ConnectionActions } from './ConnectionActions';

interface ConnectionTableProps {
  connections: Connection[];
  isLoading: boolean;
}

export const ConnectionTable = ({ connections, isLoading }: ConnectionTableProps) => {
  const columns = [
    {
      key: 'name',
      title: 'Name',
      render: (value: Connection) => (
        <div className="font-medium">{value.name}</div>
      ),
    },
    {
      key: 'host',
      title: 'Host',
    },
    {
      key: 'database',
      title: 'Database',
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: Connection) => (
        <ConnectionStatusBadge connection={value} />
      ),
    },
    {
      key: 'updatedAt',
      title: 'Last Sync',
      render: (value: Connection) => (
        <div className="text-sm text-gray-500">
          {new Date(value.updatedAt).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: Connection) => (
        <ConnectionActions connection={value} />
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={connections}
      loading={isLoading}
      onRowClick={null}
    />
  );
};