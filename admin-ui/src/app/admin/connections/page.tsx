'use client';

import { useState } from 'react';
import { useConnections } from '@/hooks/useConnections';
import { ConnectionTable } from '@/components/connections/ConnectionTable';
import { CreateConnectionModal } from '@/components/connections/CreateConnectionModal';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { Connection } from '@/lib/types';
import { Plus, RefreshCw, Database } from 'lucide-react';

type FilterType = 'all' | 'active' | 'disabled';

export default function ConnectionsPage() {
  const { data: connections, isLoading, isError, error, refetch } = useConnections();
  const [filter, setFilter] = useState<FilterType>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);

  const filteredConnections =
    filter === 'all' ? connections : connections?.filter((conn) => conn.status === filter);

  const handleRefresh = () => {
    refetch();
  };

  const handleCreateSuccess = () => {
    refetch();
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'disabled', label: 'Disabled' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Database Connections</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your MySQL database connections
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            icon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingConnection(null);
              setIsModalOpen(true);
            }}
            icon={<Plus className="w-4 h-4" />}
          >
            Add Connection
          </Button>
        </div>
      </div>

      {/* Filter Tabs + Table */}
      <Card noPadding>
        {/* Filter Tabs */}
        <div className="flex gap-1 p-1 bg-slate-50 border-b border-slate-100">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`
                px-4 py-2 text-sm font-medium rounded-md transition-all
                ${
                  filter === f.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }
              `}
            >
              {f.label}
              {f.key === 'all' && connections && (
                <span className="ml-1.5 text-xs text-slate-400">({connections.length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner size="lg" label="Loading connections..." />
            </div>
          ) : isError ? (
            <EmptyState
              icon={<Database className="w-7 h-7 text-red-400" />}
              title="Cannot connect to API"
              description={
                error?.message ||
                'Make sure the SaaS API is running and NEXT_PUBLIC_API_BASE_URL is correct'
              }
              action={
                <Button onClick={handleRefresh}>Try Again</Button>
              }
            />
          ) : filteredConnections && filteredConnections.length > 0 ? (
            <ConnectionTable
              connections={filteredConnections}
              isLoading={isLoading}
              onEditConnection={(conn) => {
                setEditingConnection(conn);
                setIsModalOpen(true);
              }}
            />
          ) : (
            <EmptyState
              icon={<Database className="w-7 h-7 text-slate-400" />}
              title="No connections found"
              description={
                filter === 'all'
                  ? 'Get started by adding your first database connection.'
                  : `No ${filter} connections found.`
              }
              action={
                filter === 'all' ? (
                  <Button
                    onClick={() => {
                      setEditingConnection(null);
                      setIsModalOpen(true);
                    }}
                    icon={<Plus className="w-4 h-4" />}
                  >
                    Add Connection
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => setFilter('all')}>
                    View All Connections
                  </Button>
                )
              }
            />
          )}
        </div>
      </Card>

      <CreateConnectionModal
        isOpen={isModalOpen}
        onClose={() => {
          setEditingConnection(null);
          setIsModalOpen(false);
        }}
        onSuccess={handleCreateSuccess}
        connection={editingConnection}
      />
    </div>
  );
}
