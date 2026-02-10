'use client';

import { useState, useMemo } from 'react';
import { useExecutions } from '@/hooks/useExecutions';
import { useConnections } from '@/hooks/useConnections';
import { ExecutionTable } from '@/components/executions/ExecutionTable';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ExecutionFilter } from '@/lib/types';
import { Play, RefreshCw, Filter, X, Database } from 'lucide-react';
import { useRouter } from 'next/navigation';

type StatusFilter = '' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export default function ExecutionsPage() {
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{
    status: StatusFilter;
    connectionId: string;
    startDate: string;
    endDate: string;
  }>({
    status: '',
    connectionId: '',
    startDate: '',
    endDate: '',
  });

  const apiFilters: ExecutionFilter = {
    ...(filters.status && { status: filters.status as ExecutionFilter['status'] }),
    ...(filters.connectionId && { connectionId: filters.connectionId }),
    ...(filters.startDate && { startDate: filters.startDate }),
    ...(filters.endDate && { endDate: filters.endDate }),
  };

  const { data: executions, isLoading, refetch } = useExecutions(apiFilters);
  const { data: connections } = useConnections();

  // Create a map of connectionId -> connection name
  const connectionMap = useMemo(() => {
    const map: Record<string, string> = {};
    connections?.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [connections]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      status: '',
      connectionId: '',
      startDate: '',
      endDate: '',
    });
  };

  const handleConnectionClick = (connectionId: string, connectionName: string) => {
    setFilters((prev) => ({ ...prev, connectionId }));
    // Show filters panel when quick filtering
    if (!showFilters) {
      setShowFilters(true);
    }
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'running', label: 'Running' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Executions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track optimization execution history and results
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            icon={<Filter className="w-4 h-4" />}
          >
            Filters
            {hasActiveFilters && (
              <span className="ml-1.5 w-2 h-2 rounded-full bg-teal-500" />
            )}
          </Button>
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
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Status
              </label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Connection
              </label>
              <select
                name="connectionId"
                value={filters.connectionId}
                onChange={handleFilterChange}
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                End Date
              </label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                icon={<X className="w-4 h-4" />}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Executions Table */}
      <Card noPadding>
        {/* Quick Connection Filter Badge */}
        {filters.connectionId && (
          <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 border-b border-teal-100">
            <Database className="w-4 h-4 text-teal-600" />
            <span className="text-sm text-teal-800">
              Filtering by: <span className="font-medium">{connectionMap[filters.connectionId] || filters.connectionId}</span>
            </span>
            <button
              onClick={() => setFilters((prev) => ({ ...prev, connectionId: '' }))}
              className="ml-auto flex items-center gap-1 text-sm text-teal-600 hover:text-teal-800"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          </div>
        )}

        <div className="p-5">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner size="lg" label="Loading executions..." />
            </div>
          ) : executions && executions.length > 0 ? (
            <ExecutionTable
              executions={executions}
              connectionMap={connectionMap}
              loading={isLoading}
              onRowClick={(execution) => {
                router.push(`/admin/executions/${execution.id}`);
              }}
              onConnectionClick={handleConnectionClick}
            />
          ) : (
            <EmptyState
              icon={<Play className="w-7 h-7 text-slate-400" />}
              title="No executions found"
              description={
                hasActiveFilters
                  ? 'No executions match your filter criteria.'
                  : 'Executions will appear here when recommendations are approved and scheduled.'
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
