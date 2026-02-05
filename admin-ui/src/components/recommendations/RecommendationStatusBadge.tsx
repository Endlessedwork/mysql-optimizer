import { RecommendationStatus } from '@/lib/types';
import StatusBadge from '@/components/ui/StatusBadge';

interface RecommendationStatusBadgeProps {
  status: RecommendationStatus;
}

export const RecommendationStatusBadge = ({ status }: RecommendationStatusBadgeProps) => {
  const statusConfig = {
    pending: { 
      color: 'bg-yellow-100 text-yellow-800', 
      label: 'Pending' 
    },
    approved: { 
      color: 'bg-blue-100 text-blue-800', 
      label: 'Approved' 
    },
    scheduled: { 
      color: 'bg-purple-100 text-purple-800', 
      label: 'Scheduled' 
    },
    executed: { 
      color: 'bg-green-100 text-green-800', 
      label: 'Executed' 
    },
    failed: { 
      color: 'bg-red-100 text-red-800', 
      label: 'Failed' 
    },
    rejected: { 
      color: 'bg-gray-100 text-gray-800', 
      label: 'Rejected' 
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <StatusBadge 
      status={config.label} 
      variant="neutral"
      className={config.color}
    />
  );
};