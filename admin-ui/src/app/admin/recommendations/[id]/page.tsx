'use client';

import { useEffect } from 'react';
import { useRecommendation } from '@/hooks/useRecommendations';
import { RecommendationDetail } from '@/components/recommendations/RecommendationDetail';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useRouter } from 'next/navigation';

export default function RecommendationDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { 
    data: recommendation, 
    isLoading, 
    isError 
  } = useRecommendation(params.id);

  useEffect(() => {
    if (isError) {
      // Redirect to recommendations list if recommendation not found
      router.push('/admin/recommendations');
    }
  }, [isError, router]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Recommendation Detail</h1>
        <button 
          onClick={() => router.push('/admin/recommendations')}
          className="text-blue-600 hover:text-blue-800"
        >
          Back to Recommendations
        </button>
      </div>

      <RecommendationDetail 
        recommendation={recommendation} 
        loading={isLoading} 
      />
    </div>
  );
}