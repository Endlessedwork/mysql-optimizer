import { RecommendationStatus } from '@/lib/types';
import StatusBadge from '@/components/ui/StatusBadge';

interface RecommendationStatusBadgeProps {
  status: RecommendationStatus;
  appliedFixes?: number;
  totalFixes?: number;
}

export const RecommendationStatusBadge = ({ status, appliedFixes, totalFixes }: RecommendationStatusBadgeProps) => {
  const statusConfig: Record<RecommendationStatus, { variant: 'success' | 'warning' | 'error' | 'info' | 'neutral'; label: string }> = {
    pending: { variant: 'warning', label: 'Pending' },
    processing: { variant: 'info', label: 'Processing' },
    completed: { variant: 'success', label: 'Completed' },
    completed_with_errors: { variant: 'error', label: 'Completed with Errors' },
    rejected: { variant: 'neutral', label: 'Rejected' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  // Show progress for processing status
  let label = config.label;
  if (status === 'processing' && totalFixes && totalFixes > 0) {
    label = `${appliedFixes || 0}/${totalFixes}`;
  }

  return (
    <StatusBadge
      status={label}
      variant={config.variant}
    />
  );
};