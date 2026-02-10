'use client';

import { useState } from 'react';
import { Execution } from '@/lib/types';
import type { ExecutionDetail as ExecutionDetailType } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ReportPreviewModal } from '@/components/ui/ReportPreviewModal';
import { ExecutionStatusBadge } from './ExecutionStatusBadge';
import { ExecutionTimeline } from './ExecutionTimeline';
import { MetricsComparison } from './MetricsComparison';
import { VerificationResult } from './VerificationResult';
import { RollbackInfo } from './RollbackInfo';
import { formatDate } from '@/lib/utils';
import { exportExecutionReport, getExecutionReportContent } from '@/lib/api-client';

interface ExecutionDetailProps {
  execution: Execution | ExecutionDetailType;
}

export const ExecutionDetail = ({ execution }: ExecutionDetailProps) => {
  const detail = execution as ExecutionDetailType;
  const hasDetail = 'baselineMetrics' in detail && detail.baselineMetrics != null;
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  
  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFormat, setPreviewFormat] = useState<'markdown' | 'json'>('markdown');
  const [previewContent, setPreviewContent] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const handleExport = async (format: 'markdown' | 'json') => {
    setExporting(true);
    setExportError(null);
    try {
      await exportExecutionReport(execution.id, format);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handlePreview = async (format: 'markdown' | 'json') => {
    setPreviewFormat(format);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewContent('');
    
    try {
      const content = await getExecutionReportContent(execution.id, format);
      setPreviewContent(content);
    } catch (error) {
      setPreviewContent(`Error: ${error instanceof Error ? error.message : 'Failed to load report'}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Actions Bar */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <ExecutionStatusBadge status={execution.status} />
            <span className="text-slate-600">
              {execution.status === 'completed' ? 'DDL changes have been applied successfully' :
               execution.status === 'failed' ? 'Execution failed - see error details below' :
               execution.status === 'running' ? 'Execution in progress...' :
               'Waiting to execute'}
            </span>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handlePreview('markdown')} disabled={exporting} variant="secondary" size="sm">
              Preview
            </Button>
            <Button onClick={() => handleExport('markdown')} disabled={exporting} variant="secondary" size="sm">
              {exporting ? 'Exporting...' : 'Export MD'}
            </Button>
            <Button onClick={() => handleExport('json')} disabled={exporting} variant="secondary" size="sm">
              {exporting ? 'Exporting...' : 'Export JSON'}
            </Button>
          </div>
        </div>
        {exportError && (
          <div className="mt-2 text-sm text-red-600">{exportError}</div>
        )}
      </Card>

      {/* Overview */}
      <Card title="Overview">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-4 rounded-lg">
            <span className="text-sm text-slate-500">Status</span>
            <div className="mt-1">
              <ExecutionStatusBadge status={execution.status} />
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg">
            <span className="text-sm text-slate-500">Started</span>
            <p className="mt-1 font-medium text-slate-900">{formatDate(execution.startedAt)}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg">
            <span className="text-sm text-slate-500">Completed</span>
            <p className="mt-1 font-medium text-slate-900">{execution.completedAt ? formatDate(execution.completedAt) : '—'}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg">
            <span className="text-sm text-slate-500">DDLs Executed</span>
            <p className="mt-1 font-medium text-2xl text-slate-900">{detail.executedDdls?.length || detail.recommendations?.length || 0}</p>
          </div>
        </div>

        {execution.error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-sm font-medium text-red-700">Error Details</span>
            <p className="mt-1 text-red-600 font-mono text-sm">{execution.error}</p>
          </div>
        )}
      </Card>

      {/* Executed DDLs */}
      {(detail.executedDdls?.length || detail.recommendations?.length) && (
        <Card title="Executed DDL Statements">
          <div className="space-y-4">
            {(detail.executedDdls || detail.recommendations || []).map((item: any, index: number) => {
              const ddl = item.ddl || item.fix_options?.[0]?.implementation;
              const rollback = item.rollback_sql || item.fix_options?.[0]?.rollback;
              const tableName = item.table_name;
              const type = item.type;
              
              return (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {type || 'DDL'}
                      </span>
                      <span className="font-medium">{tableName || 'Unknown Table'}</span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${item.success !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {item.success !== false ? '✓ Success' : '✗ Failed'}
                    </span>
                  </div>
                  
                  {ddl && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">DDL Statement:</p>
                      <pre className="bg-gray-900 text-green-400 p-3 rounded text-sm overflow-x-auto">
                        {ddl}
                      </pre>
                    </div>
                  )}
                  
                  {rollback && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Rollback SQL:</p>
                      <pre className="bg-gray-100 text-gray-700 p-3 rounded text-sm overflow-x-auto">
                        {rollback}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Existing Detail Components */}
      {hasDetail && <ExecutionTimeline execution={detail} />}
      {hasDetail && detail.baselineMetrics && detail.afterMetrics && <MetricsComparison execution={detail} />}
      {hasDetail && detail.verificationResult && <VerificationResult execution={detail} />}
      {hasDetail && detail.rollbackInfo && <RollbackInfo execution={detail} />}

      {/* Report Preview Modal */}
      <ReportPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onDownload={() => handleExport(previewFormat)}
        title={`Execution Report #${execution.id?.slice(0, 8)}`}
        content={previewContent}
        format={previewFormat}
        isLoading={previewLoading}
      />
    </div>
  );
};
