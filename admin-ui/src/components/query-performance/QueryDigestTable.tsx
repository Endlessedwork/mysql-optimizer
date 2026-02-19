'use client';

import type { QueryDigest } from '@/lib/types';
import { formatPicoseconds, formatRatio, getEfficiencyBadge, sortDigests, type SortKey } from '@/lib/query-performance-utils';
import { useState, useMemo } from 'react';
import { Search, ChevronDown } from 'lucide-react';

const PAGE_SIZE = 20;

const sortOptions: Array<{ key: SortKey; label: string }> = [
  { key: 'count', label: 'Most Executed' },
  { key: 'avgTime', label: 'Slowest Avg' },
  { key: 'totalTime', label: 'Highest Total Time' },
  { key: 'rowsExamined', label: 'Most Rows Examined' },
];

const badgeColors: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  teal: 'bg-teal-50 text-teal-700 border-teal-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  slate: 'bg-slate-50 text-slate-500 border-slate-200',
};

interface QueryDigestTableProps {
  digests: QueryDigest[];
  onSelectDigest: (digest: QueryDigest) => void;
  selectedDigestId?: string;
}

export function QueryDigestTable({ digests, onSelectDigest, selectedDigestId }: QueryDigestTableProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('count');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return digests;
    return digests.filter(d =>
      d.digestText.toLowerCase().includes(term)
    );
  }, [digests, search]);

  const sorted = useMemo(() => sortDigests(filtered, sortKey), [filtered, sortKey]);
  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search queries..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        {/* Sort */}
        <div className="relative">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="appearance-none pl-3 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
          >
            {sortOptions.map(opt => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-4 py-2.5 font-medium text-slate-500 w-[45%]">Query</th>
              <th className="px-4 py-2.5 font-medium text-slate-500 text-right">Executions</th>
              <th className="px-4 py-2.5 font-medium text-slate-500 text-right">Avg Time</th>
              <th className="px-4 py-2.5 font-medium text-slate-500 text-right">Total Time</th>
              <th className="px-4 py-2.5 font-medium text-slate-500 text-right">Rows Exam/Sent</th>
              <th className="px-4 py-2.5 font-medium text-slate-500 text-center">Efficiency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map(digest => {
              const badge = getEfficiencyBadge(digest.sumRowsExamined, digest.sumRowsSent);
              const isSelected = digest.id === selectedDigestId;
              return (
                <tr
                  key={digest.id}
                  onClick={() => onSelectDigest(digest)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-teal-50 hover:bg-teal-100'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="px-4 py-3">
                    <code className="text-xs text-slate-700 font-mono line-clamp-2 break-all">
                      {digest.digestText}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">
                    {digest.countStar.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatPicoseconds(digest.avgTimerWait)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatPicoseconds(digest.sumTimerWait)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatRatio(digest.sumRowsExamined, digest.sumRowsSent)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${badgeColors[badge.color]}`}>
                      {badge.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {search ? 'No queries match your search' : 'No query data available'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="px-4 py-3 border-t border-slate-100 text-center">
          <button
            onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
            className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
          >
            Load More ({sorted.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
