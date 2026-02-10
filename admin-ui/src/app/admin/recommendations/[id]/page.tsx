'use client';

import { useEffect } from 'react';
import { useRecommendation } from '@/hooks/useRecommendations';
import { RecommendationDetail } from '@/components/recommendations/RecommendationDetail';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function RecommendationDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const {
    data: recommendation,
    isLoading,
    isError
  } = useRecommendation(params.id);

  useEffect(() => {
    if (isError) {
      router.push('/admin/recommendations');
    }
  }, [isError, router]);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link
          href="/admin/recommendations"
          className="text-slate-500 hover:text-teal-600 transition-colors"
        >
          Recommendations
        </Link>
        {recommendation?.connectionId && (
          <>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <Link
              href={`/admin/connections/${recommendation.connectionId}`}
              className="text-slate-500 hover:text-teal-600 transition-colors"
            >
              {recommendation.connectionName || 'Connection'}
            </Link>
          </>
        )}
      </nav>

      {/* Content */}
      {recommendation != null ? (
        <RecommendationDetail
          recommendation={recommendation}
          loading={isLoading}
        />
      ) : isLoading ? (
        <div className="flex justify-center p-8">
          <LoadingSpinner />
        </div>
      ) : null}
    </div>
  );
}
