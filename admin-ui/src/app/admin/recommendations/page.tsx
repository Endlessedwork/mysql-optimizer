'use client';

import { useState, useEffect } from 'react';
import { useRecommendations } from '@/hooks/useRecommendations';
import { RecommendationTable } from '@/components/recommendations/RecommendationTable';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

export default function RecommendationsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<'all' | any>('all');
  const [connectionFilter, setConnectionFilter] = useState<string | null>(null);
  
  const { 
    data: recommendations, 
    isLoading, 
    isError 
  } = useRecommendations(statusFilter, connectionFilter);

  const handleRowClick = (id: string) => {
    router.push(`/admin/recommendations/${id}`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8 text-red-500">
        Error loading recommendations
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Recommendations</h1>
        <Button variant="primary">New Recommendation</Button>
      </div>

      <RecommendationTable
        recommendations={recommendations || []}
        onRowClick={handleRowClick}
        loading={isLoading}
        emptyStateMessage="No recommendations found"
      />
    </div>
  );
}