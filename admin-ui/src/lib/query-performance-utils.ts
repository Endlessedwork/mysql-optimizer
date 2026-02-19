import type { QueryDigest } from './types';

/** Convert picoseconds to human-readable string */
export function formatPicoseconds(ps: number): string {
  if (ps <= 0) return '0 ms';

  const ms = ps / 1_000_000_000;
  if (ms < 1) return `${(ms * 1000).toFixed(1)} µs`;
  if (ms < 1000) return `${ms.toFixed(1)} ms`;

  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(2)} s`;

  const min = sec / 60;
  return `${min.toFixed(1)} min`;
}

/** Convert picoseconds to milliseconds */
export function picoToMs(ps: number): number {
  return ps / 1_000_000_000;
}

/** Format rows examined:sent ratio */
export function formatRatio(examined: number, sent: number): string {
  if (sent === 0) return examined === 0 ? '0:0' : `${examined.toLocaleString()}:0`;
  const ratio = examined / sent;
  return `${ratio.toFixed(1)}:1`;
}

/** Compute aggregate stats from query digests */
export function computeStats(digests: QueryDigest[]) {
  const totalExecutions = digests.reduce((sum, d) => sum + d.countStar, 0);
  const uniqueQueries = digests.length;
  const totalTimePico = digests.reduce((sum, d) => sum + d.sumTimerWait, 0);
  const avgTimePico = totalExecutions > 0 ? totalTimePico / totalExecutions : 0;
  const totalRowsExamined = digests.reduce((sum, d) => sum + d.sumRowsExamined, 0);
  const totalRowsSent = digests.reduce((sum, d) => sum + d.sumRowsSent, 0);

  return {
    totalExecutions,
    uniqueQueries,
    totalTime: formatPicoseconds(totalTimePico),
    avgTime: formatPicoseconds(avgTimePico),
    totalRowsExamined,
    totalRowsSent,
    examSentRatio: formatRatio(totalRowsExamined, totalRowsSent),
  };
}

export type SortKey = 'count' | 'avgTime' | 'totalTime' | 'rowsExamined';

/** Sort digests by key (returns new array) */
export function sortDigests(
  digests: readonly QueryDigest[],
  key: SortKey,
  direction: 'asc' | 'desc' = 'desc'
): QueryDigest[] {
  const sorted = [...digests].sort((a, b) => {
    const getValue = (d: QueryDigest): number => {
      switch (key) {
        case 'count': return d.countStar;
        case 'avgTime': return d.avgTimerWait;
        case 'totalTime': return d.sumTimerWait;
        case 'rowsExamined': return d.sumRowsExamined;
      }
    };
    return getValue(a) - getValue(b);
  });

  return direction === 'desc' ? sorted.reverse() : sorted;
}

/** Get efficiency badge based on examined/sent ratio */
export function getEfficiencyBadge(examined: number, sent: number): {
  label: string;
  color: string;
} {
  if (sent === 0 && examined === 0) return { label: 'N/A', color: 'slate' };
  if (sent === 0) return { label: 'No Output', color: 'amber' };

  const ratio = examined / sent;
  if (ratio <= 1.5) return { label: 'Excellent', color: 'emerald' };
  if (ratio <= 5) return { label: 'Good', color: 'teal' };
  if (ratio <= 20) return { label: 'Fair', color: 'amber' };
  return { label: 'Poor', color: 'red' };
}
