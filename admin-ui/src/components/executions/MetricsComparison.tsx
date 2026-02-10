import { ExecutionDetail } from '@/lib/types';
import { Card } from '@/components/ui/Card';

interface MetricsComparisonProps {
  execution: ExecutionDetail;
}

export const MetricsComparison = ({ execution }: MetricsComparisonProps) => {
  const baseline = execution.baselineMetrics;
  const after = execution.afterMetrics;

  // ถ้าไม่มี metrics ให้แสดงข้อความแจ้งเตือน
  if (!baseline || !after) {
    return (
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Metrics Comparison</h3>
        <p className="text-slate-500 text-center py-4">
          Metrics data is not available yet.
        </p>
      </Card>
    );
  }

  // คำนวณการเปลี่ยนแปลง
  const queryTimeChange = baseline.queryTime - after.queryTime;
  const rowsExaminedChange = baseline.rowsExamined - after.rowsExamined;
  const tableSizeChange = baseline.tableSize - after.tableSize;

  // คำนวณเปอร์เซ็นต์
  const queryTimePercent = baseline.queryTime ? (queryTimeChange / baseline.queryTime) * 100 : 0;
  const rowsExaminedPercent = baseline.rowsExamined ? (rowsExaminedChange / baseline.rowsExamined) * 100 : 0;
  const tableSizePercent = baseline.tableSize ? (tableSizeChange / baseline.tableSize) * 100 : 0;

  // ตรวจสอบว่าเป็นการปรับปรุงหรือไม่
  const isQueryTimeImproved = queryTimeChange > 0;
  const isRowsExaminedImproved = rowsExaminedChange > 0;
  const isTableSizeImproved = tableSizeChange > 0;

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Metrics Comparison</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">Query Time</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Before:</span>
              <span>{baseline.queryTime} ms</span>
            </div>
            <div className="flex justify-between">
              <span>After:</span>
              <span>{after.queryTime} ms</span>
            </div>
            <div className={`flex justify-between ${isQueryTimeImproved ? 'text-green-600' : 'text-red-600'}`}>
              <span>Change:</span>
              <span>{queryTimeChange > 0 ? '-' : ''}{Math.abs(queryTimeChange)} ms ({queryTimePercent.toFixed(1)}%)</span>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">Rows Examined</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Before:</span>
              <span>{baseline.rowsExamined}</span>
            </div>
            <div className="flex justify-between">
              <span>After:</span>
              <span>{after.rowsExamined}</span>
            </div>
            <div className={`flex justify-between ${isRowsExaminedImproved ? 'text-green-600' : 'text-red-600'}`}>
              <span>Change:</span>
              <span>{rowsExaminedChange > 0 ? '-' : ''}{Math.abs(rowsExaminedChange)} ({rowsExaminedPercent.toFixed(1)}%)</span>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">Table Size</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Before:</span>
              <span>{baseline.tableSize} MB</span>
            </div>
            <div className="flex justify-between">
              <span>After:</span>
              <span>{after.tableSize} MB</span>
            </div>
            <div className={`flex justify-between ${isTableSizeImproved ? 'text-green-600' : 'text-red-600'}`}>
              <span>Change:</span>
              <span>{tableSizeChange > 0 ? '-' : ''}{Math.abs(tableSizeChange)} MB ({tableSizePercent.toFixed(1)}%)</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};