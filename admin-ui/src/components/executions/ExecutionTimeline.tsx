import { ExecutionDetail } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { formatDate } from '@/lib/utils';

interface ExecutionTimelineProps {
  execution: ExecutionDetail;
}

export const ExecutionTimeline = ({ execution }: ExecutionTimelineProps) => {
  // สร้าง timeline steps
  const steps = [
    {
      id: 'created',
      label: 'Created',
      timestamp: execution.startedAt,
      status: 'completed',
    },
    {
      id: 'approved',
      label: 'Approved',
      timestamp: execution.startedAt, // ใช้เวลาเดียวกันชั่วคราว
      status: 'completed',
    },
    {
      id: 'started',
      label: 'Started',
      timestamp: execution.startedAt,
      status: execution.status === 'pending' ? 'current' : 'completed',
    },
    {
      id: 'completed',
      label: 'Completed',
      timestamp: execution.completedAt,
      status: execution.status === 'completed' ? 'completed' : 'pending',
    },
    {
      id: 'failed',
      label: 'Failed',
      timestamp: execution.completedAt,
      status: execution.status === 'failed' ? 'completed' : 'pending',
    },
    {
      id: 'verified',
      label: 'Verified',
      timestamp: execution.verificationResult?.checkedAt,
      status: execution.verificationResult?.status === 'pending' ? 'current' : 'completed',
    },
    {
      id: 'rolled_back',
      label: 'Rolled Back',
      timestamp: execution.rollbackInfo?.rolledBackAt,
      status: execution.status === 'rolled_back' ? 'completed' : 'pending',
    },
  ];

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Execution Timeline</h3>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 transform translate-x-1/2"></div>
        
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={step.id} className="relative flex items-start">
              <div className={`absolute left-4 w-3 h-3 rounded-full border-2 border-white ${
                step.status === 'completed' ? 'bg-green-500' : 
                step.status === 'current' ? 'bg-blue-500 animate-pulse' : 
                'bg-gray-300'
              }`}></div>
              <div className="ml-12">
                <h4 className="font-medium">{step.label}</h4>
                <p className="text-sm text-gray-500">
                  {step.timestamp ? formatDate(step.timestamp) : 'N/A'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};