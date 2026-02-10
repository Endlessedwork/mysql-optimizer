import { RecommendationStatus } from '@/lib/types';
import StatusBadge from '@/components/ui/StatusBadge';

interface RecommendationStatusBadgeProps {
  status: RecommendationStatus;
}

export const RecommendationStatusBadge = ({ status }: RecommendationStatusBadgeProps) => {
  const statusConfig: Record<RecommendationStatus, { variant: 'success' | 'warning' | 'error' | 'info' | 'neutral'; label: string }> = {
    pending: { variant: 'warning', label: 'Pending' },
    approved: { variant: 'info', label: 'Approved' },
    scheduled: { variant: 'info', label: 'Scheduled' },
    executed: { variant: 'success', label: 'Executed' },
    failed: { variant: 'error', label: 'Failed' },
    rejected: { variant: 'neutral', label: 'Rejected' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <StatusBadge
      status={config.label}
      variant={config.variant}
    />
  );
};