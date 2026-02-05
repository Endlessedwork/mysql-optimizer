'use client';

import { useState } from 'react';
import { useConnections } from '@/hooks/useConnections';
import { ConnectionTable } from '@/components/connections/ConnectionTable';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

export default function ConnectionsPage() {
  const { data: connections, isLoading, isError, error, refetch } = useConnections();
  const [filter, setFilter] = useState<'all' | 'active' | 'disabled'>('all');

  const filteredConnections = filter === 'all' 
    ? connections 
    : connections?.filter((conn) => conn.status === filter);

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Database Connections</h1>
        <Button variant="primary" onClick={handleRefresh} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      <Card>
        <div className="flex space-x-4 mb-6">
          <Button 
            variant={filter === 'all' ? 'primary' : 'ghost'} 
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button 
            variant={filter === 'active' ? 'primary' : 'ghost'} 
            onClick={() => setFilter('active')}
          >
            Active
          </Button>
          <Button 
            variant={filter === 'disabled' ? 'primary' : 'ghost'} 
            onClick={() => setFilter('disabled')}
          >
            Disabled
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : isError ? (
          <EmptyState
            title="ไม่สามารถเชื่อมต่อ API ได้"
            description={error?.message || 'ตรวจสอบว่า SaaS API รันอยู่และ NEXT_PUBLIC_API_BASE_URL ถูกต้อง'}
            action={<Button variant="primary" onClick={handleRefresh}>ลองใหม่</Button>}
          />
        ) : filteredConnections && filteredConnections.length > 0 ? (
          <ConnectionTable 
            connections={filteredConnections} 
            isLoading={isLoading} 
          />
        ) : (
          <EmptyState 
            title="No connections found"
            description="There are no database connections configured."
            action={
              <Button variant="primary" disabled>
                Add Connection
              </Button>
            }
          />
        )}
      </Card>
    </div>
  );
}