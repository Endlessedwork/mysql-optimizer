import { ExecutionDetail } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { formatDate } from '@/lib/utils';

interface VerificationResultProps {
  execution: ExecutionDetail;
}

export const VerificationResult = ({ execution }: VerificationResultProps) => {
  const verification = execution.verificationResult;

  if (!verification) {
    return (
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Verification Result</h3>
        <p className="text-gray-500">No verification data available</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Verification Result</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="font-medium">Status:</span>
          <span className={verification.status === 'pass' ? 'text-green-600' : verification.status === 'fail' ? 'text-red-600' : 'text-gray-600'}>
            {verification.status.charAt(0).toUpperCase() + verification.status.slice(1)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Checked at:</span>
          <span>{formatDate(verification.checkedAt)}</span>
        </div>
        <div>
          <span className="font-medium">Details:</span>
          <p className="mt-1">{verification.details}</p>
        </div>
        <div>
          <span className="font-medium">Pass Criteria:</span>
          <p className="mt-1">Query time should be reduced by at least 20%</p>
        </div>
      </div>
    </Card>
  );
};