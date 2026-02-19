'use client';

import type { QueryDigest } from '@/lib/types';
import { computeStats } from '@/lib/query-performance-utils';
import { useMemo } from 'react';
import { Activity, Hash, Clock, Timer, Search, Ratio } from 'lucide-react';

interface QueryStatsOverviewProps {
  digests: QueryDigest[];
}

export function QueryStatsOverview({ digests }: QueryStatsOverviewProps) {
  const stats = useMemo(() => computeStats(digests), [digests]);

  const cards = [
    { label: 'Total Executions', value: stats.totalExecutions.toLocaleString(), icon: <Activity className="w-5 h-5 text-teal-600" /> },
    { label: 'Unique Queries', value: stats.uniqueQueries.toLocaleString(), icon: <Hash className="w-5 h-5 text-violet-600" /> },
    { label: 'Total Exec Time', value: stats.totalTime, icon: <Clock className="w-5 h-5 text-amber-600" /> },
    { label: 'Avg Exec Time', value: stats.avgTime, icon: <Timer className="w-5 h-5 text-blue-600" /> },
    { label: 'Rows Examined', value: stats.totalRowsExamined.toLocaleString(), icon: <Search className="w-5 h-5 text-rose-600" /> },
    { label: 'Exam/Sent Ratio', value: stats.examSentRatio, icon: <Ratio className="w-5 h-5 text-slate-600" /> },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            {card.icon}
            <p className="text-xs text-slate-500 font-medium">{card.label}</p>
          </div>
          <p className="text-xl font-bold text-slate-800">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
