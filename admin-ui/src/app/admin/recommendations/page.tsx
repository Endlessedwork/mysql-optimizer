'use client';

import { useState, useMemo } from 'react';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useConnections } from '@/hooks/useConnections';
import { RecommendationTable } from '@/components/recommendations/RecommendationTable';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { Lightbulb, RefreshCw, X, Database, AlertTriangle, AlertCircle, Info, CheckCircle2, Table2, FileCode2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type StatusFilter = 'all' | 'pending' | 'approved' | 'scheduled' | 'executed' | 'failed';

export default function RecommendationsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [connectionFilter, setConnectionFilter] = useState<string | null>(null);
  const [connectionFilterName, setConnectionFilterName] = useState<string | null>(null);

  const { data: connections } = useConnections();
  const {
    data: recommendations,
    isLoading,
    isError,
    refetch,
  } = useRecommendations(statusFilter, connectionFilter);

  // Create a map of connectionId -> connection name
  const connectionMap = useMemo(() => {
    const map: Record<string, string> = {};
    connections?.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [connections]);

  // Aggregate stats across all recommendations
  const aggregatedStats = useMemo(() => {
    if (!recommendations || recommendations.length === 0) {
      return {
        totalPacks: 0,
        totalIssues: 0,
        totalCritical: 0,
        totalHigh: 0,
        totalMedium: 0,
        totalLow: 0,
        totalTables: 0,
        issueTypes: {} as Record<string, number>
      };
    }

    let totalIssues = 0;
    let totalCritical = 0;
    let totalHigh = 0;
    let totalMedium = 0;
    let totalLow = 0;
    const allTables = new Set<string>();
    const issueTypes: Record<string, number> = {};

    for (const rec of recommendations) {
      totalIssues += rec.totalCount || 0;
      totalCritical += rec.severityCounts?.critical || 0;
      totalHigh += rec.severityCounts?.high || 0;
      totalMedium += rec.severityCounts?.medium || 0;
      totalLow += rec.severityCounts?.low || 0;

      rec.affectedTables?.forEach(t => allTables.add(t));

      rec.topIssues?.forEach(issue => {
        issueTypes[issue.type] = (issueTypes[issue.type] || 0) + issue.count;
      });
    }

    return {
      totalPacks: recommendations.length,
      totalIssues,
      totalCritical,
      totalHigh,
      totalMedium,
      totalLow,
      totalTables: allTables.size,
      issueTypes
    };
  }, [recommendations]);

  const handleRowClick = (id: string) => {
    router.push(`/admin/recommendations/${id}`);
  };

  const handleConnectionClick = (connectionId: string, connectionName: string) => {
    setConnectionFilter(connectionId);
    setConnectionFilterName(connectionName);
  };

  const clearConnectionFilter = () => {
    setConnectionFilter(null);
    setConnectionFilterName(null);
  };

  const filters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'executed', label: 'Executed' },
    { key: 'failed', label: 'Failed' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recommendations</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review and approve optimization suggestions from the Agent
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          icon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </Button>
      </div>

      {/* Summary Stats Cards */}
      {!isLoading && recommendations && recommendations.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Total Packs */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <FileCode2 className="w-4 h-4" />
              <span className="text-xs font-medium">Scan Reports</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{aggregatedStats.totalPacks}</div>
          </div>

          {/* Total Issues */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Lightbulb className="w-4 h-4" />
              <span className="text-xs font-medium">Total Issues</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{aggregatedStats.totalIssues}</div>
          </div>

          {/* Critical */}
          <div className="bg-red-50 rounded-lg border border-red-100 p-4">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-medium">Critical</span>
            </div>
            <div className="text-2xl font-bold text-red-700">{aggregatedStats.totalCritical}</div>
          </div>

          {/* High */}
          <div className="bg-orange-50 rounded-lg border border-orange-100 p-4">
            <div className="flex items-center gap-2 text-orange-600 mb-1">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-medium">High</span>
            </div>
            <div className="text-2xl font-bold text-orange-700">{aggregatedStats.totalHigh}</div>
          </div>

          {/* Medium */}
          <div className="bg-yellow-50 rounded-lg border border-yellow-100 p-4">
            <div className="flex items-center gap-2 text-yellow-600 mb-1">
              <Info className="w-4 h-4" />
              <span className="text-xs font-medium">Medium</span>
            </div>
            <div className="text-2xl font-bold text-yellow-700">{aggregatedStats.totalMedium}</div>
          </div>

          {/* Low */}
          <div className="bg-green-50 rounded-lg border border-green-100 p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-medium">Low</span>
            </div>
            <div className="text-2xl font-bold text-green-700">{aggregatedStats.totalLow}</div>
          </div>

          {/* Affected Tables */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Table2 className="w-4 h-4" />
              <span className="text-xs font-medium">Tables</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{aggregatedStats.totalTables}</div>
          </div>
        </div>
      )}

      {/* Filter Tabs + Table */}
      <Card noPadding>
        {/* Connection Filter Badge */}
        {connectionFilter && connectionFilterName && (
          <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 border-b border-teal-100">
            <Database className="w-4 h-4 text-teal-600" />
            <span className="text-sm text-teal-800">
              Filtering by: <span className="font-medium">{connectionFilterName}</span>
            </span>
            <button
              onClick={clearConnectionFilter}
              className="ml-auto flex items-center gap-1 text-sm text-teal-600 hover:text-teal-800"
            >
              <X className="w-4 h-4" />
              Clear filter
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-1 p-1 bg-slate-50 border-b border-slate-100 overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`
                px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap
                ${
                  statusFilter === f.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }
              `}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner size="lg" label="Loading recommendations..." />
            </div>
          ) : isError ? (
            <EmptyState
              icon={<Lightbulb className="w-7 h-7 text-red-400" />}
              title="Error loading recommendations"
              description="There was an error loading recommendations. Please try again."
              action={<Button onClick={() => refetch()}>Try Again</Button>}
            />
          ) : recommendations && recommendations.length > 0 ? (
            <RecommendationTable
              recommendations={recommendations}
              connectionMap={connectionMap}
              onRowClick={handleRowClick}
              onConnectionClick={handleConnectionClick}
              loading={isLoading}
              emptyStateMessage="No recommendations found."
            />
          ) : (
            <EmptyState
              icon={<Lightbulb className="w-7 h-7 text-slate-400" />}
              title="No recommendations found"
              description={
                statusFilter === 'all'
                  ? 'Connect a database and run a scan to generate recommendations.'
                  : `No ${statusFilter} recommendations found.`
              }
              action={
                statusFilter !== 'all' ? (
                  <Button variant="secondary" onClick={() => setStatusFilter('all')}>
                    View All
                  </Button>
                ) : undefined
              }
            />
          )}
        </div>
      </Card>
    </div>
  );
}
