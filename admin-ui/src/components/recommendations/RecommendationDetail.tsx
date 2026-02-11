'use client';

import { useState, useMemo } from 'react';
import type { RecommendationDetail as RecommendationDetailType, RawRecommendation, FixOption, RecommendationStep } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ReportPreviewModal } from '@/components/ui/ReportPreviewModal';
import { RecommendationActions } from './RecommendationActions';
import { StepRoadmap } from './StepRoadmap';
import { exportRecommendationReport, getRecommendationReportContent, executeSingleFix, executeRecommendationStep } from '@/lib/api-client';
import { CodeBlock } from '@/components/ui/CodeBlock';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  Table2,
  Clock,
  Database,
  Zap,
  Play,
  Loader2
} from 'lucide-react';

interface RecommendationDetailProps {
  recommendation: RecommendationDetailType;
  loading: boolean;
}

// Severity badge component
const SeverityBadge = ({ severity }: { severity: string }) => {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    critical: { bg: 'bg-red-100 border-red-200', text: 'text-red-800', icon: <AlertTriangle className="w-3 h-3" /> },
    high: { bg: 'bg-orange-100 border-orange-200', text: 'text-orange-800', icon: <AlertCircle className="w-3 h-3" /> },
    medium: { bg: 'bg-yellow-100 border-yellow-200', text: 'text-yellow-800', icon: <Info className="w-3 h-3" /> },
    low: { bg: 'bg-green-100 border-green-200', text: 'text-green-800', icon: <CheckCircle2 className="w-3 h-3" /> },
  };
  const c = config[severity] || config.medium;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border ${c.bg} ${c.text}`}>
      {c.icon}
      {severity.toUpperCase()}
    </span>
  );
};

// Problem type name mapping
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
    'large_table': 'Large Table'
  };
  return names[type] || type.replace(/_/g, ' ');
};

// Extract short SQL name from implementation (e.g., "CREATE INDEX idx_user_id ON users")
const getSqlShortName = (rec: RawRecommendation): string => {
  const sql = rec.fix_options?.[0]?.implementation || '';

  // Try to extract meaningful name from SQL
  // CREATE INDEX idx_name ON table -> CREATE INDEX idx_name
  const createIndexMatch = sql.match(/CREATE\s+INDEX\s+(\w+)\s+ON\s+(\w+)/i);
  if (createIndexMatch) {
    return `CREATE INDEX ${createIndexMatch[1]} ON ${createIndexMatch[2]}`;
  }

  // ALTER TABLE table_name ADD INDEX -> ALTER TABLE table_name
  const alterMatch = sql.match(/ALTER\s+TABLE\s+(\w+)/i);
  if (alterMatch) {
    return `ALTER TABLE ${alterMatch[1]}`;
  }

  // OPTIMIZE TABLE table_name -> OPTIMIZE TABLE table_name
  const optimizeMatch = sql.match(/OPTIMIZE\s+TABLE\s+(\w+)/i);
  if (optimizeMatch) {
    return `OPTIMIZE TABLE ${optimizeMatch[1]}`;
  }

  // If SQL is short enough, return as is
  if (sql.length <= 50) {
    return sql || getTypeName(rec.problem_statement);
  }

  // Truncate long SQL
  return sql.substring(0, 47) + '...';
};

// Format number with commas
const formatNumber = (num: number | string | undefined): string => {
  if (num === undefined) return 'N/A';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return String(num);
  return n.toLocaleString();
};

// Single recommendation row component
const RecommendationRow = ({
  rec,
  index,
  packId,
  onApply,
  onApplyResult
}: {
  rec: RawRecommendation;
  index: number;
  packId: string;
  onApply?: (rec: RawRecommendation) => void;
  onApplyResult?: (success: boolean, message: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const evidence = rec.evidence?.metrics || {};
  const fixOption = rec.fix_options?.[0];

  const handleApply = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!fixOption?.implementation || applying || applied) return;

    setApplying(true);
    try {
      const result = await executeSingleFix({
        recommendationPackId: packId,
        recommendationIndex: index,
        fixIndex: 0,
        sql: fixOption.implementation
      });

      if (result.ok && result.data) {
        setApplied(true);
        onApplyResult?.(true, `Fix queued successfully! Execution ID: ${result.data.id.substring(0, 8)}`);
      } else {
        onApplyResult?.(false, result.error || 'Failed to queue fix');
      }

      onApply?.(rec);
    } catch (error) {
      onApplyResult?.(false, 'Failed to apply fix');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      {/* Row Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <button className="p-0.5">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
        </button>

        <span className="text-xs font-mono text-slate-400 w-8">#{index + 1}</span>

        <SeverityBadge severity={rec.severity} />

        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-900 truncate font-mono text-sm">
            {getSqlShortName(rec)}
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="text-slate-400">{getTypeName(rec.problem_statement)}</span>
            {rec.table && (
              <span className="flex items-center gap-1">
                <Table2 className="w-3 h-3" />
                {rec.table}
              </span>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="hidden md:flex items-center gap-4 text-xs text-slate-500">
          {evidence.rows_examined && (
            <div className="flex items-center gap-1">
              <Database className="w-3 h-3" />
              {formatNumber(evidence.rows_examined)} rows
            </div>
          )}
          {evidence.avg_time_ms && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {evidence.avg_time_ms}ms
            </div>
          )}
          {rec.expected_gain?.performance_improvement && (
            <div className="flex items-center gap-1 text-green-600">
              <Zap className="w-3 h-3" />
              +{rec.expected_gain.performance_improvement}%
            </div>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 py-4 bg-slate-50 border-t border-slate-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Evidence & Metrics */}
            <div className="space-y-4">
              {/* Query */}
              {rec.query && (
                <CodeBlock
                  code={rec.query}
                  language="sql"
                  title="Problem Query"
                  variant="default"
                  collapsedHeight={80}
                />
              )}

              {/* Evidence Metrics */}
              {Object.keys(evidence).length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Evidence Metrics
                  </h5>
                  <div className="grid grid-cols-2 gap-2">
                    {evidence.rows_examined !== undefined && (
                      <div className="bg-white rounded p-2 border border-slate-200">
                        <div className="text-xs text-slate-500">Rows Examined</div>
                        <div className="font-bold text-slate-900">{formatNumber(evidence.rows_examined)}</div>
                      </div>
                    )}
                    {evidence.rows_sent !== undefined && (
                      <div className="bg-white rounded p-2 border border-slate-200">
                        <div className="text-xs text-slate-500">Rows Sent</div>
                        <div className="font-bold text-slate-900">{formatNumber(evidence.rows_sent)}</div>
                      </div>
                    )}
                    {evidence.ratio && (
                      <div className="bg-white rounded p-2 border border-slate-200">
                        <div className="text-xs text-slate-500">Examine/Sent Ratio</div>
                        <div className="font-bold text-red-600">{evidence.ratio}x</div>
                      </div>
                    )}
                    {evidence.efficiency && (
                      <div className="bg-white rounded p-2 border border-slate-200">
                        <div className="text-xs text-slate-500">Efficiency</div>
                        <div className="font-bold text-slate-900">{evidence.efficiency}</div>
                      </div>
                    )}
                    {evidence.avg_time_ms !== undefined && (
                      <div className="bg-white rounded p-2 border border-slate-200">
                        <div className="text-xs text-slate-500">Avg Time</div>
                        <div className="font-bold text-slate-900">{evidence.avg_time_ms}ms</div>
                      </div>
                    )}
                    {evidence.execution_count !== undefined && (
                      <div className="bg-white rounded p-2 border border-slate-200">
                        <div className="text-xs text-slate-500">Execution Count</div>
                        <div className="font-bold text-slate-900">{formatNumber(evidence.execution_count)}</div>
                      </div>
                    )}
                    {evidence.fragmentation_pct !== undefined && (
                      <div className="bg-white rounded p-2 border border-slate-200">
                        <div className="text-xs text-slate-500">Fragmentation</div>
                        <div className="font-bold text-orange-600">{evidence.fragmentation_pct}%</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Risk & Expected Gain */}
              <div className="grid grid-cols-2 gap-4">
                {rec.risk && (
                  <div>
                    <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Risk Assessment
                    </h5>
                    <div className="bg-white rounded p-3 border border-slate-200 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Level</span>
                        <span className="font-medium text-slate-900 capitalize">{rec.risk.level}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Score</span>
                        <span className="font-medium text-slate-900">{rec.risk.score}/100</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Confidence</span>
                        <span className="font-medium text-slate-900">{rec.risk.confidence}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {rec.expected_gain && (
                  <div>
                    <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Expected Gain
                    </h5>
                    <div className="bg-green-50 rounded p-3 border border-green-200 space-y-1">
                      {rec.expected_gain.performance_improvement && (
                        <div className="flex justify-between text-sm">
                          <span className="text-green-700">Performance</span>
                          <span className="font-bold text-green-800">+{rec.expected_gain.performance_improvement}%</span>
                        </div>
                      )}
                      {rec.expected_gain.resource_savings && (
                        <div className="flex justify-between text-sm">
                          <span className="text-green-700">Resources</span>
                          <span className="font-bold text-green-800">-{rec.expected_gain.resource_savings}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: SQL Fix & Rollback */}
            <div className="space-y-4">
              {/* Fix Option */}
              {fixOption && (
                <div className="space-y-3">
                  {fixOption.description && (
                    <div>
                      <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Recommended Fix
                      </h5>
                      <p className="text-sm text-slate-600 bg-white rounded-lg border border-slate-200 p-3">
                        {fixOption.description}
                      </p>
                    </div>
                  )}

                  {/* Multi-step Roadmap OR Single SQL */}
                  {fixOption.is_multistep && fixOption.steps ? (
                    <StepRoadmap
                      fixOption={fixOption as FixOption}
                      onExecuteStep={async (step) => {
                        try {
                          const result = await executeRecommendationStep({
                            recommendationPackId: packId,
                            recommendationIndex: index,
                            fixIndex: 0,
                            stepId: step.id,
                            sql: step.sql
                          });

                          if (result.ok && result.data) {
                            onApplyResult?.(true, `Step ${step.step_number} queued successfully! Execution ID: ${result.data.id.substring(0, 8)}`);
                          } else {
                            onApplyResult?.(false, result.error || 'Failed to queue step execution');
                          }
                        } catch (error) {
                          onApplyResult?.(false, 'Failed to execute step');
                        }
                      }}
                    />
                  ) : (
                    <>
                      {fixOption.implementation && (
                        <CodeBlock
                          code={fixOption.implementation}
                          language="sql"
                          title="SQL Implementation"
                          variant="success"
                          collapsedHeight={100}
                        />
                      )}

                      {/* Apply Button - only for non-multistep */}
                      <Button
                        variant={applied ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={handleApply}
                        disabled={applying || applied || !fixOption.implementation}
                        icon={
                          applying ? <Loader2 className="w-4 h-4 animate-spin" /> :
                          applied ? <CheckCircle2 className="w-4 h-4" /> :
                          <Play className="w-4 h-4" />
                        }
                        className="w-full"
                      >
                        {applying ? 'Queueing...' : applied ? 'Queued for Execution' : 'Apply This Fix'}
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Rollback */}
              {fixOption?.rollback && (
                <CodeBlock
                  code={fixOption.rollback}
                  language="sql"
                  title="Rollback SQL"
                  variant="danger"
                  collapsedHeight={80}
                />
              )}

              {/* Trade-offs */}
              {rec.trade_offs && Object.keys(rec.trade_offs).length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Trade-offs
                  </h5>
                  <div className="bg-amber-50 rounded p-3 border border-amber-200 space-y-1 text-sm">
                    {rec.trade_offs.downtime && (
                      <div className="flex justify-between">
                        <span className="text-amber-700">Downtime</span>
                        <span className="text-amber-900">{rec.trade_offs.downtime}</span>
                      </div>
                    )}
                    {rec.trade_offs.lock_risk && (
                      <div className="flex justify-between">
                        <span className="text-amber-700">Lock Risk</span>
                        <span className="text-amber-900">{rec.trade_offs.lock_risk}</span>
                      </div>
                    )}
                    {rec.trade_offs.disk_usage && (
                      <div className="flex justify-between">
                        <span className="text-amber-700">Disk Usage</span>
                        <span className="text-amber-900">{rec.trade_offs.disk_usage}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const RecommendationDetail = ({
  recommendation,
  loading
}: RecommendationDetailProps) => {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFormat, setPreviewFormat] = useState<'markdown' | 'json'>('markdown');
  const [previewContent, setPreviewContent] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyNotification, setApplyNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const handleApplyResult = (success: boolean, message: string) => {
    setApplyNotification({ type: success ? 'success' : 'error', message });
    // Auto-hide after 5 seconds
    setTimeout(() => setApplyNotification(null), 5000);
  };

  const rawRecs = recommendation.rawRecommendations || [];

  // Aggregate stats
  const stats = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    const types: Record<string, number> = {};
    const tables = new Set<string>();

    for (const rec of rawRecs) {
      const sev = rec.severity || 'medium';
      if (sev in counts) counts[sev as keyof typeof counts]++;

      const type = rec.problem_statement || 'unknown';
      types[type] = (types[type] || 0) + 1;

      if (rec.table) tables.add(rec.table);
    }

    return {
      total: rawRecs.length,
      counts,
      types: Object.entries(types).sort((a, b) => b[1] - a[1]),
      tablesCount: tables.size
    };
  }, [rawRecs]);

  // Filtered recommendations
  const filteredRecs = useMemo(() => {
    return rawRecs.filter(rec => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTable = rec.table?.toLowerCase().includes(q);
        const matchesQuery = rec.query?.toLowerCase().includes(q);
        const matchesType = rec.problem_statement?.toLowerCase().includes(q);
        if (!matchesTable && !matchesQuery && !matchesType) return false;
      }

      // Severity filter
      if (severityFilter !== 'all' && rec.severity !== severityFilter) return false;

      // Type filter
      if (typeFilter !== 'all' && rec.problem_statement !== typeFilter) return false;

      return true;
    });
  }, [rawRecs, searchQuery, severityFilter, typeFilter]);

  const handleExport = async (format: 'markdown' | 'json') => {
    setExporting(true);
    setExportError(null);
    try {
      await exportRecommendationReport(recommendation.id, format);
    } catch (error) {
      setExportError('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const handlePreview = async (format: 'markdown' | 'json') => {
    setPreviewFormat(format);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewContent('');
    try {
      const content = await getRecommendationReportContent(recommendation.id, format);
      setPreviewContent(content);
    } catch (error) {
      setPreviewContent(`Error: ${error instanceof Error ? error.message : 'Failed to load report'}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
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
      {/* Apply Notification */}
      {applyNotification && (
        <div className={`rounded-lg p-4 flex items-center gap-3 ${
          applyNotification.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {applyNotification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{applyNotification.message}</span>
          <button
            onClick={() => setApplyNotification(null)}
            className="ml-auto text-current opacity-70 hover:opacity-100"
          >
            &times;
          </button>
        </div>
      )}

      {/* Connection Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Database className="w-8 h-8 opacity-90" />
          <div>
            <h1 className="text-2xl font-bold">
              {recommendation.connectionName || 'Unknown Connection'}
            </h1>
            {recommendation.databaseName && recommendation.databaseName !== recommendation.connectionName && (
              <p className="text-teal-100 text-sm">
                Database: {recommendation.databaseName}
              </p>
            )}
          </div>
        </div>
        <p className="text-teal-100 mt-2">
          {stats.total} recommendations for {stats.tablesCount} tables
        </p>
      </div>

      {/* Export Actions */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Optimization Report
            </h2>
            <p className="text-sm text-slate-500">
              Review and apply recommended fixes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => handlePreview('markdown')} disabled={exporting}>
              Preview
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleExport('markdown')} disabled={exporting}>
              Export MD
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleExport('json')} disabled={exporting}>
              Export JSON
            </Button>
          </div>
        </div>
        {exportError && <div className="mt-2 text-sm text-red-600">{exportError}</div>}
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">Total Issues</div>
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-100 p-4">
          <div className="text-xs text-red-600 mb-1">Critical</div>
          <div className="text-2xl font-bold text-red-700">{stats.counts.critical}</div>
        </div>
        <div className="bg-orange-50 rounded-lg border border-orange-100 p-4">
          <div className="text-xs text-orange-600 mb-1">High</div>
          <div className="text-2xl font-bold text-orange-700">{stats.counts.high}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg border border-yellow-100 p-4">
          <div className="text-xs text-yellow-600 mb-1">Medium</div>
          <div className="text-2xl font-bold text-yellow-700">{stats.counts.medium}</div>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-100 p-4">
          <div className="text-xs text-green-600 mb-1">Low</div>
          <div className="text-2xl font-bold text-green-700">{stats.counts.low}</div>
        </div>
      </div>

      {/* Issue Types Breakdown */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Issues by Type</h3>
        <div className="flex flex-wrap gap-2">
          {stats.types.map(([type, count]) => (
            <button
              key={type}
              onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-full border transition-colors ${
                typeFilter === type
                  ? 'bg-teal-50 border-teal-300 text-teal-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {getTypeName(type)}
              <span className="font-mono text-xs bg-white px-1.5 py-0.5 rounded">
                {count}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Filters & Search */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search tables, queries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Types</option>
            {stats.types.map(([type]) => (
              <option key={type} value={type}>{getTypeName(type)}</option>
            ))}
          </select>
        </div>

        {/* Results count */}
        <div className="mt-3 text-sm text-slate-500">
          Showing {filteredRecs.length} of {stats.total} recommendations
        </div>
      </Card>

      {/* Recommendations List */}
      <Card noPadding>
        <div className="divide-y divide-slate-100">
          {filteredRecs.length > 0 ? (
            filteredRecs.map((rec, idx) => (
              <RecommendationRow
                key={rec.id || idx}
                rec={rec}
                index={idx}
                packId={recommendation.id}
                onApplyResult={handleApplyResult}
              />
            ))
          ) : (
            <div className="text-center py-12 text-slate-500">
              No recommendations match your filters
            </div>
          )}
        </div>
      </Card>

      {/* Actions */}
      <RecommendationActions recommendation={recommendation} />

      {/* Report Preview Modal */}
      <ReportPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onDownload={() => handleExport(previewFormat)}
        title={`Optimization Report`}
        content={previewContent}
        format={previewFormat}
        isLoading={previewLoading}
      />
    </div>
  );
};
