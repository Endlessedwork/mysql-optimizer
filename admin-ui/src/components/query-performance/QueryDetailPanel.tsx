'use client';

import type { QueryDigest } from '@/lib/types';
import { formatPicoseconds, formatRatio, getEfficiencyBadge } from '@/lib/query-performance-utils';
import { useState, useEffect } from 'react';
import { X, Clock, Timer, Search, ArrowDownUp, Copy, Check, Maximize2, Minimize2 } from 'lucide-react';

const badgeColors: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  teal: 'bg-teal-50 text-teal-700 border-teal-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  slate: 'bg-slate-50 text-slate-500 border-slate-200',
};

const efficiencyTips: Record<string, string> = {
  Excellent: 'This query efficiently reads only the rows it needs.',
  Good: 'Acceptable efficiency. Minor optimization may help.',
  Fair: 'Examining significantly more rows than returned. Consider adding indexes.',
  Poor: 'High row scan vs output ratio. Likely missing index or inefficient query pattern.',
  'No Output': 'Query examines rows but sends none (e.g. writes, aggregates returning 0).',
  'N/A': 'No execution data available.',
};

interface QueryDetailPanelProps {
  digest: QueryDigest;
  onClose: () => void;
}

export function QueryDetailPanel({ digest, onClose }: QueryDetailPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const badge = getEfficiencyBadge(digest.sumRowsExamined, digest.sumRowsSent);

  // Reset expand/copy state when switching digest
  useEffect(() => {
    setExpanded(false);
    setCopied(false);
  }, [digest.id]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(digest.digestText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = digest.digestText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const statItems = [
    { label: 'Execution Count', value: digest.countStar.toLocaleString(), icon: <ArrowDownUp className="w-4 h-4 text-teal-600" /> },
    { label: 'Avg Time', value: formatPicoseconds(digest.avgTimerWait), icon: <Timer className="w-4 h-4 text-blue-600" /> },
    { label: 'Min Time', value: formatPicoseconds(digest.minTimerWait), icon: <Clock className="w-4 h-4 text-emerald-600" /> },
    { label: 'Max Time', value: formatPicoseconds(digest.maxTimerWait), icon: <Clock className="w-4 h-4 text-red-600" /> },
    { label: 'Total Time', value: formatPicoseconds(digest.sumTimerWait), icon: <Clock className="w-4 h-4 text-amber-600" /> },
    { label: 'Rows Examined (total)', value: digest.sumRowsExamined.toLocaleString(), icon: <Search className="w-4 h-4 text-rose-600" /> },
    { label: 'Rows Sent (total)', value: digest.sumRowsSent.toLocaleString(), icon: <Search className="w-4 h-4 text-violet-600" /> },
    { label: 'Avg Rows Examined', value: Math.round(digest.avgRowsExamined).toLocaleString() },
    { label: 'Avg Rows Sent', value: Math.round(digest.avgRowsSent).toLocaleString() },
    { label: 'Exam/Sent Ratio', value: formatRatio(digest.sumRowsExamined, digest.sumRowsSent) },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">Query Detail</h3>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* SQL */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-500">SQL Digest</p>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
                title="Copy SQL"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
              <button
                onClick={() => setExpanded(prev => !prev)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
                title={expanded ? 'Collapse' : 'Expand'}
              >
                {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{expanded ? 'Collapse' : 'Expand'}</span>
              </button>
            </div>
          </div>
          <pre className={`bg-slate-900 text-slate-100 rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed ${
            expanded ? '' : 'max-h-28 overflow-y-hidden'
          }`}>
            {digest.digestText}
          </pre>
          {!expanded && digest.digestText.length > 200 && (
            <button
              onClick={() => setExpanded(true)}
              className="mt-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors"
            >
              Show full query ({digest.digestText.length} chars)
            </button>
          )}
        </div>

        {/* Efficiency */}
        <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
          <span className={`shrink-0 inline-block mt-0.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badgeColors[badge.color]}`}>
            {badge.label}
          </span>
          <p className="text-sm text-slate-600">{efficiencyTips[badge.label]}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {statItems.map(item => (
            <div key={item.label} className="p-3 rounded-lg border border-slate-100">
              <div className="flex items-center gap-1.5 mb-1">
                {item.icon}
                <p className="text-xs text-slate-500">{item.label}</p>
              </div>
              <p className="text-lg font-semibold text-slate-800">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
