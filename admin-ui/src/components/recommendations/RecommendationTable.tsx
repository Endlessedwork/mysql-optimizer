"use client";

import { useState } from 'react';
import { Recommendation } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { RecommendationStatusBadge } from './RecommendationStatusBadge';
import { Database, ChevronDown, ChevronRight, AlertTriangle, AlertCircle, Info, Table2, FileCode2 } from 'lucide-react';

interface RecommendationTableProps {
  recommendations: Recommendation[];
  connectionMap?: Record<string, string>;
  onRowClick: (id: string) => void;
  onConnectionClick?: (connectionId: string, connectionName: string) => void;
  loading: boolean;
  emptyStateMessage?: string;
}

// Severity badge component
const SeverityBadge = ({ severity, count }: { severity: string; count: number }) => {
  if (count === 0) return null;

  const styles: Record<string, string> = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-green-100 text-green-800 border-green-200',
  };

  const icons: Record<string, React.ReactNode> = {
    critical: <AlertTriangle className="w-3 h-3" />,
    high: <AlertCircle className="w-3 h-3" />,
    medium: <Info className="w-3 h-3" />,
    low: <Info className="w-3 h-3" />,
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border ${styles[severity] || 'bg-gray-100 text-gray-800'}`}>
      {icons[severity]}
      {count}
    </span>
  );
};

// Issue type name mapping
const getTypeName = (type: string): string => {
  const names: Record<string, string> = {
    'full_table_scan': 'Full Table Scan',
    'filesort': 'Filesort',
    'filesort_temp_table': 'Filesort + Temp Table',
    'temporary_table': 'Temporary Table',
    'high_rows_examined': 'High Rows Examined',
    'index_scan': 'Index Scan',
    'where_without_index': 'WHERE Without Index',
    'table_fragmentation': 'Table Fragmentation',
    'unused_index': 'Unused Index',
    'slow_query': 'Slow Query',
    'inefficient_query': 'Inefficient Query',
    'missing_index': 'Missing Index',
    'large_table': 'Large Table',
    'duplicate_index': 'Duplicate Index',
    'redundant_index': 'Redundant Index',
    'low_cardinality_index': 'Low Cardinality Index',
    'unindexed_foreign_key': 'Unindexed Foreign Key',
    'lock_contention': 'Lock Contention'
  };
  return names[type] || type.replace(/_/g, ' ');
};

export const RecommendationTable = ({
  recommendations,
  connectionMap = {},
  onRowClick,
  onConnectionClick,
  loading,
  emptyStateMessage = 'No recommendations found'
}: RecommendationTableProps) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        {emptyStateMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="w-8 px-3 py-3"></th>
            <th className="px-3 py-3 text-left font-semibold text-slate-700">Connection</th>
            <th className="px-3 py-3 text-left font-semibold text-slate-700">Issues</th>
            <th className="px-3 py-3 text-left font-semibold text-slate-700">Severity Breakdown</th>
            <th className="px-3 py-3 text-left font-semibold text-slate-700">Top Issues</th>
            <th className="px-3 py-3 text-left font-semibold text-slate-700">Tables</th>
            <th className="px-3 py-3 text-left font-semibold text-slate-700">Status</th>
            <th className="px-3 py-3 text-left font-semibold text-slate-700">Created</th>
            <th className="px-3 py-3 text-right font-semibold text-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {recommendations.map((rec) => {
            const isExpanded = expandedRows.has(rec.id);
            const connName = rec.connectionName || connectionMap[rec.connectionId] || 'Unknown';
            const severities = rec.severityCounts || { critical: 0, high: 0, medium: 0, low: 0 };
            const totalSeverity = severities.critical + severities.high + severities.medium + severities.low;

            return (
              <>
                <tr
                  key={rec.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  {/* Expand button */}
                  <td className="px-3 py-3">
                    <button
                      onClick={() => toggleRow(rec.id)}
                      className="p-1 hover:bg-slate-200 rounded transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                  </td>

                  {/* Connection */}
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onConnectionClick && rec.connectionId) {
                            onConnectionClick(rec.connectionId, connName);
                          }
                        }}
                        className="flex items-center gap-2 font-medium text-slate-900 hover:text-teal-600 transition-colors text-left"
                        title="Click to filter by this connection"
                      >
                        <Database className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-[150px]">{connName}</span>
                      </button>
                      {rec.databaseName && (
                        <span className="text-xs text-slate-500 ml-6 truncate max-w-[150px]">
                          {rec.databaseName}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Total Issues */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-slate-900">
                        {rec.totalCount || totalSeverity || 0}
                      </span>
                      <span className="text-xs text-slate-500">issues</span>
                    </div>
                  </td>

                  {/* Severity Breakdown */}
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      <SeverityBadge severity="critical" count={severities.critical} />
                      <SeverityBadge severity="high" count={severities.high} />
                      <SeverityBadge severity="medium" count={severities.medium} />
                      <SeverityBadge severity="low" count={severities.low} />
                    </div>
                  </td>

                  {/* Top Issues */}
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-0.5 max-w-[200px]">
                      {(rec.topIssues || []).slice(0, 2).map((issue, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-xs">
                          <span className="font-medium text-slate-700 truncate">
                            {getTypeName(issue.type)}
                          </span>
                          <span className="text-slate-400">({issue.count})</span>
                        </div>
                      ))}
                      {(rec.topIssues?.length || 0) > 2 && (
                        <span className="text-xs text-slate-400">
                          +{rec.topIssues!.length - 2} more
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Affected Tables */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <Table2 className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-700">
                        {rec.affectedTablesCount || 0}
                      </span>
                      <span className="text-xs text-slate-500">tables</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3">
                    <RecommendationStatusBadge
                      status={rec.status}
                      appliedFixes={(rec as any).appliedFixes}
                      totalFixes={(rec as any).totalFixes || rec.totalCount}
                    />
                  </td>

                  {/* Created */}
                  <td className="px-3 py-3 text-slate-500">
                    {rec.createdAt ? new Date(rec.createdAt).toLocaleString('th-TH', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'N/A'}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-3 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRowClick(rec.id);
                      }}
                      icon={<FileCode2 className="w-3 h-3" />}
                    >
                      Details
                    </Button>
                  </td>
                </tr>

                {/* Expanded Row - Additional Details */}
                {isExpanded && (
                  <tr key={`${rec.id}-expanded`} className="bg-slate-50">
                    <td colSpan={9} className="px-6 py-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        {/* All Issue Types */}
                        <div>
                          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            All Issue Types
                          </h4>
                          <div className="space-y-1">
                            {(rec.topIssues || []).map((issue, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="text-slate-700">{getTypeName(issue.type)}</span>
                                <span className="font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  {issue.count}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Affected Tables */}
                        <div>
                          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            Affected Tables ({rec.affectedTablesCount || 0})
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {(rec.affectedTables || []).slice(0, 10).map((table, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 text-xs font-mono bg-slate-100 text-slate-700 rounded"
                              >
                                {table}
                              </span>
                            ))}
                            {(rec.affectedTablesCount || 0) > 10 && (
                              <span className="text-xs text-slate-500">
                                +{(rec.affectedTablesCount || 0) - 10} more
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quick Stats */}
                        <div>
                          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            Quick Stats
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-red-50 rounded p-2">
                              <div className="text-red-600 font-bold text-lg">{severities.critical}</div>
                              <div className="text-xs text-red-500">Critical</div>
                            </div>
                            <div className="bg-orange-50 rounded p-2">
                              <div className="text-orange-600 font-bold text-lg">{severities.high}</div>
                              <div className="text-xs text-orange-500">High</div>
                            </div>
                            <div className="bg-yellow-50 rounded p-2">
                              <div className="text-yellow-600 font-bold text-lg">{severities.medium}</div>
                              <div className="text-xs text-yellow-500">Medium</div>
                            </div>
                            <div className="bg-green-50 rounded p-2">
                              <div className="text-green-600 font-bold text-lg">{severities.low}</div>
                              <div className="text-xs text-green-500">Low</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* View Full Details Button */}
                      <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onRowClick(rec.id)}
                        >
                          View Full Report & Execute
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
