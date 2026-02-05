import { Badge } from '@/components/ui/Badge';

interface ExecutionStatusBadgeProps {
  status: string;
}

export const ExecutionStatusBadge = ({ status }: ExecutionStatusBadgeProps) => {
  let variant = 'default';
  let text = status;

  switch (status) {
    case 'pending':
      variant = 'warning';
      text = 'Pending';
      break;
    case 'running':
      variant = 'info';
      text = 'Running';
      break;
    case 'completed':
      variant = 'success';
      text = 'Completed';
      break;
    case 'failed':
      variant = 'error';
      text = 'Failed';
      break;
    case 'rolled_back':
      variant = 'warning';
      text = 'Rolled Back';
      break;
    default:
      variant = 'default';
  }

  return <Badge variant={variant}>{text}</Badge>;
};