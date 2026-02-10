'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useConnection } from '@/hooks/useConnections';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useExecutions } from '@/hooks/useExecutions';
import { ConnectionStatusBadge } from '@/components/connections/ConnectionStatusBadge';
import { ConnectionActions } from '@/components/connections/ConnectionActions';
import { testConnection, deleteConnection } from '@/lib/api-client';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ConnectionDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: connection, isLoading, refetch } = useConnection(id as string);
  const { data: recommendations } = useRecommendations();
  const { data: executions } = useExecutions();
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Count recommendations and executions for this connection
  const connectionRecommendations = recommendations?.filter(r => r.connectionId === id) || [];
  const connectionExecutions = executions?.filter(e => e.connectionId === id) || [];

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await testConnection(id as string);
      if (response.ok && response.data?.connected) {
        setTestResult({ success: true, message: 'Connection successful!' });
      } else {
        setTestResult({ success: false, message: response.error || 'Connection failed' });
      }
    } catch {
      setTestResult({ success: false, message: 'Failed to test connection' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDeleteConnection = async () => {
    if (!confirm('Are you sure you want to delete this connection?')) return;
    setIsDeleting(true);
    try {
      const response = await deleteConnection(id as string);
      if (response.ok) {
        router.push('/admin/connections');
      } else {
        alert(response.error || 'Failed to delete connection');
      }
    } catch {
      alert('Failed to delete connection');
    } finally {
      setIsDeleting(false);
    }
  };

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
        <div className="flex space-x-3">
          <Button 
            variant="ghost" 
            onClick={handleTestConnection} 
            disabled={isTesting}
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeleteConnection}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
          <ConnectionActions connection={connection} onStatusChange={refetch} />
        </div>
      </div>

      {testResult && (
        <div className={`rounded-md p-4 ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className={`text-sm font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
            {testResult.message}
          </p>
        </div>
      )}

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
                <p className="text-sm font-medium text-gray-500">ID</p>
                <p className="text-gray-900 font-mono text-sm">{connection.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Created At</p>
                <p className="text-gray-900">{new Date(connection.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Updated At</p>
                <p className="text-gray-900">{new Date(connection.updatedAt).toLocaleString()}</p>
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
                <p className="text-sm font-medium text-gray-500">Optimization Status</p>
                <p className="text-gray-900 mt-1">
                  {connection.status === 'active' ? (
                    <span className="text-green-600">Active - Optimization is running</span>
                  ) : (
                    <span className="text-red-600">Disabled - Optimization is paused</span>
                  )}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Recommendations</p>
                <p className="text-gray-900 mt-1">
                  {connectionRecommendations.length} recommendation{connectionRecommendations.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Executions</p>
                <p className="text-gray-900 mt-1">
                  {connectionExecutions.length} execution{connectionExecutions.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}