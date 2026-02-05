import { RecommendationDetail } from '@/lib/types';

interface ImpactAnalysisProps {
  recommendation: RecommendationDetail;
}

export const ImpactAnalysis = ({ recommendation }: ImpactAnalysisProps) => {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Impact Analysis</h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-500">Estimated Query Improvement</p>
            <p className="text-2xl font-bold text-green-600">45%</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-500">Table Size</p>
            <p className="text-2xl font-bold">2.4 GB</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-500">Affected Queries</p>
            <p className="text-2xl font-bold">12</p>
          </div>
        </div>
        
        <div className="mt-4">
          <p className="text-sm text-gray-500">Risk Level</p>
          <div className="mt-2 flex items-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              Medium
            </span>
            <p className="ml-2 text-gray-600">Low risk of data loss or performance degradation</p>
          </div>
        </div>
      </div>
    </div>
  );
};