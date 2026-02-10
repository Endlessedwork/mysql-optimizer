'use client';

import { useState, useMemo } from 'react';
import { useScanRuns } from '@/hooks/useScanRuns';
import { useConnections } from '@/hooks/useConnections';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { RefreshCw, Search, Database, Clock, CheckCircle, XCircle, Loader2, X } from 'lucide-react';
import type { ScanRun, ScanRunStatus } from '@/lib/types';

type StatusFilter = '' | ScanRunStatus;

const statusConfig: Record<ScanRunStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'error'; icon: React.ReactNode }> = {
  pending: { label: 'Pending', variant: 'default', icon: <Clock className="w-3.5 h-3.5" /> },
  running: { label: 'Running', variant: 'warning', icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
  completed: { label: 'Completed', variant: 'success', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  failed: { label: 'Failed', variant: 'error', icon: <XCircle className="w-3.5 h-3.5" /> },
};

export default function ScansPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [connectionFilter, setConnectionFilter] = useState<string>('');

  const { data: scanRuns, isLoading, refetch } = useScanRuns({
    status: statusFilter || undefined,
    connectionProfileId: connectionFilter || undefined,
  });
  const { data: connections } = useConnections();

  // Create connection map for quick lookup
  const connectionMap = useMemo(() => {
    const map: Record<string, string> = {};
    connections?.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [connections]);

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'running', label: 'Running' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
  ];

  const handleResetFilters = () => {
    setStatusFilter('');
    setConnectionFilter('');
  };

  const hasActiveFilters = statusFilter !== '' || connectionFilter !== '';

  // Calculate stats
  const stats = useMemo(() => {
    if (!scanRuns) return { pending: 0, running: 0, completed: 0, failed: 0 };
    return {
      pending: scanRuns.filter(s => s.status === 'pending').length,
      running: scanRuns.filter(s => s.status === 'running').length,
      completed: scanRuns.filter(s => s.status === 'completed').length,
      failed: scanRuns.filter(s => s.status === 'failed').length,
    };
  }, [scanRuns]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Scan Runs</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor database scan progress and results
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">{stats.pending}</p>
              <p className="text-xs text-slate-500">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">{stats.running}</p>
              <p className="text-xs text-slate-500">Running</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">{stats.completed}</p>
              <p className="text-xs text-slate-500">Completed</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">{stats.failed}</p>
              <p className="text-xs text-slate-500">Failed</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Connection
            </label>
            <select
              value={connectionFilter}
              onChange={(e) => setConnectionFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="">All Connections</option>
              {connections?.map((conn) => (
                <option key={conn.id} value={conn.id}>
                  {conn.name}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                icon={<X className="w-4 h-4" />}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Scan Runs List */}
      <Card noPadding>
        <div className="p-5">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner size="lg" label="Loading scan runs..." />
            </div>
          ) : scanRuns && scanRuns.length > 0 ? (
            <div className="space-y-3">
              {scanRuns.map((scan) => (
                <ScanRunCard
                  key={scan.id}
                  scan={scan}
                  connectionName={scan.connectionName || connectionMap[scan.connectionProfileId]}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Search className="w-7 h-7 text-slate-400" />}
              title="No scan runs found"
              description={
                hasActiveFilters
                  ? 'No scans match your filter criteria.'
                  : 'Click "Run Scan" on a connection to start analyzing your database.'
              }
              action={
                hasActiveFilters ? (
                  <Button variant="secondary" onClick={handleResetFilters}>
                    Clear Filters
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

interface ScanRunCardProps {
  scan: ScanRun;
  connectionName?: string;
}

function ScanRunCard({ scan, connectionName }: ScanRunCardProps) {
  const config = statusConfig[scan.status];

  const getDuration = () => {
    if (!scan.startedAt) return null;
    const start = new Date(scan.startedAt);
    const end = scan.completedAt ? new Date(scan.completedAt) : new Date();
    const diff = end.getTime() - start.getTime();

    if (diff < 1000) return '<1s';
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
      {/* Connection Info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
          <Database className="w-5 h-5 text-teal-600" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-slate-900 truncate">
            {connectionName || 'Unknown Connection'}
          </p>
          <p className="text-xs text-slate-500 font-mono truncate">
            {scan.id.slice(0, 8)}...
          </p>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex-shrink-0">
        <Badge variant={config.variant} className="flex items-center gap-1.5">
          {config.icon}
          {config.label}
        </Badge>
      </div>

      {/* Duration/Time */}
      <div className="text-right flex-shrink-0 w-24">
        {scan.status === 'running' ? (
          <p className="text-sm font-medium text-amber-600">{getDuration()}</p>
        ) : scan.status === 'completed' ? (
          <p className="text-sm text-slate-600">{getDuration()}</p>
        ) : scan.status === 'pending' ? (
          <p className="text-sm text-slate-400">Waiting...</p>
        ) : null}
        <p className="text-xs text-slate-400">{formatDate(scan.createdAt)}</p>
      </div>

      {/* Error Message */}
      {scan.status === 'failed' && scan.errorMessage && (
        <div className="flex-shrink-0 max-w-xs">
          <p className="text-xs text-red-600 truncate" title={scan.errorMessage}>
            {scan.errorMessage}
          </p>
        </div>
      )}
    </div>
  );
}
