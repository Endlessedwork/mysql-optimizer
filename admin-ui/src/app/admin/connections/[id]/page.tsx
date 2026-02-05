'use client';

import { useParams } from 'next/navigation';
import { useConnection } from '@/hooks/useConnections';
import { ConnectionStatusBadge } from '@/components/connections/ConnectionStatusBadge';
import { ConnectionActions } from '@/components/connections/ConnectionActions';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ConnectionDetailPage() {
  const { id } = useParams();
  const { data: connection, isLoading } = useConnection(id as string);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium text-gray-900">Connection not found</h2>
        <p className="text-gray-500 mt-2">The connection you are looking for does not exist.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Connection Details</h1>
        <ConnectionActions connection={connection} />
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Connection Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Name</p>
                <p className="text-gray-900">{connection.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Host</p>
                <p className="text-gray-900">{connection.host}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Port</p>
                <p className="text-gray-900">{connection.port}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Database</p>
                <p className="text-gray-900">{connection.database}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Username</p>
                <p className="text-gray-900">{connection.username}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Created At</p>
                <p className="text-gray-900">{new Date(connection.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <div className="mt-1">
                  <ConnectionStatusBadge connection={connection} />
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Kill Switch Status</p>
                <p className="text-gray-900 mt-1">
                  {connection.status === 'active' ? (
                    <span className="text-green-600">Active - Optimization is running</span>
                  ) : (
                    <span className="text-red-600">Disabled - Optimization is paused</span>
                  )}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Recent Recommendations</p>
                <p className="text-gray-900 mt-1">0 recommendations</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Recent Executions</p>
                <p className="text-gray-900 mt-1">0 executions</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}