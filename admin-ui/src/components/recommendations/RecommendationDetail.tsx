import { RecommendationDetail } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { ImpactAnalysis } from './ImpactAnalysis';
import { DDLPreview } from './DDLPreview';
import { RecommendationActions } from './RecommendationActions';

interface RecommendationDetailProps {
  recommendation: RecommendationDetail;
  loading: boolean;
}

export const RecommendationDetail = ({ 
  recommendation, 
  loading 
}: RecommendationDetailProps) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div className="text-center py-8 text-gray-500">
        Recommendation not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Connection Info</h3>
            <div className="mt-2 space-y-2">
              <p><span className="font-medium">Connection ID:</span> {recommendation.connectionId}</p>
              <p><span className="font-medium">Status:</span> Active</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900">Recommendation Info</h3>
            <div className="mt-2 space-y-2">
              <p><span className="font-medium">Title:</span> {recommendation.title}</p>
              <p><span className="font-medium">Description:</span> {recommendation.description}</p>
              <p><span className="font-medium">Impact:</span> {recommendation.impact}</p>
              <p><span className="font-medium">Created:</span> {new Date(recommendation.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Table & Columns</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="font-medium">Table Name</p>
            <p className="text-gray-600">users</p>
          </div>
          <div>
            <p className="font-medium">Columns</p>
            <p className="text-gray-600">id, email, created_at</p>
          </div>
        </div>
      </Card>

      <ImpactAnalysis recommendation={recommendation} />

      <DDLPreview sql={recommendation.sql} />

      <RecommendationActions recommendation={recommendation} />
    </div>
  );
};