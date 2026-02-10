'use client';

import { useExecution } from '@/hooks/useExecutions';
import { ExecutionDetail } from '@/components/executions/ExecutionDetail';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ConnectionInfoCard } from '@/components/ui/ConnectionInfoCard';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function ExecutionDetailPage({ params }: { params: { id: string } }) {
  const { execution, loading, error } = useExecution(params.id);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-4">
        <p className="text-red-600">Error: {error}</p>
      </Card>
    );
  }

  if (!execution) {
    return (
      <Card className="p-4">
        <p>Execution not found</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link
          href="/admin/executions"
          className="text-slate-500 hover:text-teal-600 transition-colors"
        >
          Executions
        </Link>
        <ChevronRight className="w-4 h-4 text-slate-400" />
        {execution.connectionId && (
          <>
            <Link
              href={`/admin/connections/${execution.connectionId}`}
              className="text-slate-500 hover:text-teal-600 transition-colors"
            >
              {execution.connectionName || 'Connection'}
            </Link>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </>
        )}
        <span className="text-slate-900 font-medium">
          #{params.id.slice(0, 8)}
        </span>
      </nav>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Execution Detail</h1>
        <p className="text-slate-500 mt-1">View execution status and applied changes</p>
      </div>

      {/* Connection Info Card */}
      <ConnectionInfoCard
        connectionId={execution.connectionId}
        connectionName={execution.connectionName}
        databaseName={execution.databaseName}
      />

      {/* Execution Details */}
      <ExecutionDetail execution={execution} />
    </div>
  );
}
