'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useConnection } from '@/hooks/useConnections';
import { getConnectionQueryPerformance } from '@/lib/api-client';
import { QueryStatsOverview } from '@/components/query-performance/QueryStatsOverview';
import { QueryDigestTable } from '@/components/query-performance/QueryDigestTable';
import { QueryDetailPanel } from '@/components/query-performance/QueryDetailPanel';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, Activity } from 'lucide-react';
import type { QueryDigest } from '@/lib/types';

export default function QueryPerformancePage() {
  const { id } = useParams();
  const router = useRouter();
  const connectionId = id as string;

  const [selectedDigest, setSelectedDigest] = useState<QueryDigest | null>(null);

  const { data: connection, isLoading: connLoading } = useConnection(connectionId);

  const { data: perfData, isLoading: perfLoading, error: perfError } = useQuery({
    queryKey: ['connection-query-performance', connectionId],
    queryFn: async () => {
      const response = await getConnectionQueryPerformance(connectionId);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch query performance');
      }
      return response.data!;
    },
    enabled: !!connectionId,
  });

  if (connLoading || perfLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (perfError) {
    const errMsg = perfError instanceof Error ? perfError.message : 'Failed to load query performance';
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push('/admin/connections')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Connections
        </button>
        <Card>
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-slate-700 mb-2">No Query Performance Data</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {errMsg}. Please run a scan on this connection first.
            </p>
            <Button
              variant="primary"
              className="mt-4"
              onClick={() => router.push('/admin/connections')}
            >
              Go Back
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const digests = perfData?.digests || [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/connections')}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <span className="text-slate-300">/</span>
          <h1 className="text-xl font-bold text-slate-800">
            {connection?.name || 'Connection'} — Query Performance
          </h1>
        </div>
        {perfData?.scanRunCreatedAt && (
          <span className="text-xs text-slate-400">
            Last scan: {new Date(perfData.scanRunCreatedAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
          </span>
        )}
      </div>

      {/* Stats Overview */}
      <QueryStatsOverview digests={digests} />

      {/* Table + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={selectedDigest ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <QueryDigestTable
            digests={digests}
            onSelectDigest={setSelectedDigest}
            selectedDigestId={selectedDigest?.id}
          />
        </div>
        {selectedDigest && (
          <div className="lg:col-span-1 lg:sticky lg:top-4 lg:self-start">
            <QueryDetailPanel
              digest={selectedDigest}
              onClose={() => setSelectedDigest(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
