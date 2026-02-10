import { RecommendationDetail } from '@/lib/types';

interface ImpactAnalysisProps {
  recommendation: RecommendationDetail;
}

export const ImpactAnalysis = ({ recommendation }: ImpactAnalysisProps) => {
  // Extract metrics from recommendation if available
  const metrics = recommendation.metrics || {};
  const estimatedImprovement = metrics.estimatedImprovement || metrics.queryImprovement || 'N/A';
  const tableSize = metrics.tableSize || 'N/A';
  const affectedQueries = metrics.affectedQueries || metrics.queriesAffected || 'N/A';
  
  // Determine risk level based on impact
  const getRiskLevel = () => {
    const impact = recommendation.impact?.toLowerCase();
    if (impact === 'high') return { label: 'High', color: 'bg-red-100 text-red-800', desc: 'Significant impact - careful review required' };
    if (impact === 'medium') return { label: 'Medium', color: 'bg-yellow-100 text-yellow-800', desc: 'Moderate impact - standard review recommended' };
    return { label: 'Low', color: 'bg-green-100 text-green-800', desc: 'Low risk - minimal impact expected' };
  };
  
  const risk = getRiskLevel();
  
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Impact Analysis</h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-500">Estimated Query Improvement</p>
            <p className="text-2xl font-bold text-green-600">
              {typeof estimatedImprovement === 'number' ? `${estimatedImprovement}%` : estimatedImprovement}
            </p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-500">Table Size</p>
            <p className="text-2xl font-bold">{tableSize}</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-500">Affected Queries</p>
            <p className="text-2xl font-bold">{affectedQueries}</p>
          </div>
        </div>
        
        <div className="mt-4">
          <p className="text-sm text-gray-500">Risk Level</p>
          <div className="mt-2 flex items-center">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${risk.color}`}>
              {risk.label}
            </span>
            <p className="ml-2 text-gray-600">{risk.desc}</p>
          </div>
        </div>
      </div>
    </div>
  );
};