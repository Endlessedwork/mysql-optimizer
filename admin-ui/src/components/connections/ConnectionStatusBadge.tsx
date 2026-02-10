import { Badge } from '@/components/ui/Badge';
import { Connection } from '@/lib/types';

interface ConnectionStatusBadgeProps {
  connection: Connection;
}

export const ConnectionStatusBadge = ({ connection }: ConnectionStatusBadgeProps) => {
  const isActive = connection.status === 'active';

  return (
    <Badge variant={isActive ? 'success' : 'default'}>
      {isActive ? 'Active' : 'Disabled'}
    </Badge>
  );
};
