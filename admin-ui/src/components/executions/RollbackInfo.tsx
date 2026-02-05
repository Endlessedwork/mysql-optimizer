import { ExecutionDetail } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { formatDate } from '@/lib/utils';

interface RollbackInfoProps {
  execution: ExecutionDetail;
}

export const RollbackInfo = ({ execution }: RollbackInfoProps) => {
  const rollback = execution.rollbackInfo;

  if (!rollback) {
    return (
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Rollback Information</h3>
        <p className="text-gray-500">No rollback information available</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Rollback Information</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="font-medium">Rolled Back At:</span>
          <span>{formatDate(rollback.rolledBackAt)}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Reason:</span>
          <span>{rollback.reason}</span>
        </div>
        <div>
          <span className="font-medium">Rollback DDL:</span>
          <pre className="mt-1 p-2 bg-gray-100 rounded text-sm overflow-auto">
            {rollback.rollbackDdl}
          </pre>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Triggered By:</span>
          <span className={rollback.triggeredBy === 'auto' ? 'text-blue-600' : 'text-green-600'}>
            {rollback.triggeredBy === 'auto' ? 'Auto' : 'Manual'}
          </span>
        </div>
      </div>
    </Card>
  );
};