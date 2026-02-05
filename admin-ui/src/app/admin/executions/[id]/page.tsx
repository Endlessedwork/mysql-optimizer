'use client';

import { useEffect } from 'react';
import { useExecution } from '@/hooks/useExecutions';
import { ExecutionDetail } from '@/components/executions/ExecutionDetail';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';

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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Execution Detail</h1>
        <Button variant="outline">Back to List</Button>
      </div>
      
      <ExecutionDetail execution={execution} />
    </div>
  );
}