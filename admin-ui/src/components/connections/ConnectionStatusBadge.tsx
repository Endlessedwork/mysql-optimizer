import StatusBadge from '@/components/ui/StatusBadge';
import { Connection } from '@/lib/types';

interface ConnectionStatusBadgeProps {
  connection: Connection;
}

export const ConnectionStatusBadge = ({ connection }: ConnectionStatusBadgeProps) => {
  return (
    <StatusBadge 
      status={connection.status === 'active' ? 'Active' : 'Disabled'} 
      variant={connection.status === 'active' ? 'success' : 'error'}
    />
  );
};