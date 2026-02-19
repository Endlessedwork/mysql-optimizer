"use client";

import { useState } from 'react';
import { Plus, Minus, RefreshCw, ArrowRight } from 'lucide-react';
import type { SchemaSnapshot, SchemaDiff, SchemaDiffItem } from '@/lib/types';
import { getConnectionSchemaDiff } from '@/lib/api-client';

interface SchemaDiffViewerProps {
  connectionId: string;
  snapshots: SchemaSnapshot[];
}

export function SchemaDiffViewer({ connectionId, snapshots }: SchemaDiffViewerProps) {
  const [fromId, setFromId] = useState<string>(snapshots[1]?.id || '');
  const [toId, setToId] = useState<string>(snapshots[0]?.id || '');
  const [diff, setDiff] = useState<SchemaDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    if (!fromId || !toId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getConnectionSchemaDiff(connectionId, fromId, toId);
      if (response.ok && response.data) {
        setDiff(response.data);
      } else {
        setError(response.error || 'Failed to compute diff');
      }
    } catch {
      setError('Failed to compute diff');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
    } catch {
      return dateStr;
    }
  };

  if (snapshots.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        Need at least 2 scan snapshots to compare. Run more scans first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-slate-500 mb-1 block">From (older)</label>
          <select
            value={fromId}
            onChange={e => setFromId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Select snapshot...</option>
            {snapshots.map(s => (
              <option key={s.id} value={s.id}>
                {formatDate(s.scanRunCreatedAt || s.createdAt)} ({s.id.substring(0, 8)})
              </option>
            ))}
          </select>
        </div>

        <ArrowRight className="w-5 h-5 text-slate-400 mt-5 shrink-0" />

        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-slate-500 mb-1 block">To (newer)</label>
          <select
            value={toId}
            onChange={e => setToId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Select snapshot...</option>
            {snapshots.map(s => (
              <option key={s.id} value={s.id}>
                {formatDate(s.scanRunCreatedAt || s.createdAt)} ({s.id.substring(0, 8)})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCompare}
          disabled={!fromId || !toId || fromId === toId || loading}
          className="mt-5 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Compare
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Diff result */}
      {diff && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="Tables" added={diff.summary.tablesAdded} removed={diff.summary.tablesRemoved} />
            <SummaryCard label="Columns" added={diff.summary.columnsAdded} removed={diff.summary.columnsRemoved} changed={diff.summary.columnsChanged} />
            <SummaryCard label="Indexes" added={diff.summary.indexesAdded} removed={diff.summary.indexesRemoved} />
            <SummaryCard label="Foreign Keys" added={diff.summary.foreignKeysAdded} removed={diff.summary.foreignKeysRemoved} />
          </div>

          {/* Changes list */}
          {diff.changes.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No structural changes detected between these snapshots.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
              {diff.changes.map((change, i) => (
                <DiffRow key={i} change={change} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, added, removed, changed }: { label: string; added: number; removed: number; changed?: number }) {
  const total = added + removed + (changed || 0);
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="text-lg font-semibold text-slate-800 mt-1">
        {total === 0 ? (
          <span className="text-slate-300">No changes</span>
        ) : (
          <span>{total} changes</span>
        )}
      </p>
      <div className="flex items-center gap-3 mt-1 text-xs">
        {added > 0 && <span className="text-green-600">+{added}</span>}
        {removed > 0 && <span className="text-red-600">-{removed}</span>}
        {(changed ?? 0) > 0 && <span className="text-amber-600">~{changed}</span>}
      </div>
    </div>
  );
}

function DiffRow({ change }: { change: SchemaDiffItem }) {
  const icon = change.type === 'added' ? <Plus className="w-3.5 h-3.5 text-green-600" /> :
               change.type === 'removed' ? <Minus className="w-3.5 h-3.5 text-red-600" /> :
               <RefreshCw className="w-3.5 h-3.5 text-amber-600" />;

  const bgColor = change.type === 'added' ? 'bg-green-50' :
                  change.type === 'removed' ? 'bg-red-50' :
                  'bg-amber-50';

  const entityLabels: Record<string, string> = {
    table: 'TABLE',
    column: 'COLUMN',
    index: 'INDEX',
    foreign_key: 'FK',
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 ${bgColor}`}>
      {icon}
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
        change.entity === 'table' ? 'bg-teal-100 text-teal-700' :
        change.entity === 'column' ? 'bg-blue-100 text-blue-700' :
        change.entity === 'index' ? 'bg-purple-100 text-purple-700' :
        'bg-pink-100 text-pink-700'
      }`}>
        {entityLabels[change.entity] || change.entity}
      </span>
      <span className="font-mono text-sm text-slate-800">
        {change.tableName ? `${change.tableName}.` : ''}{change.name}
      </span>
      {change.details && (
        <span className="ml-auto text-xs text-slate-500">
          {Object.entries(change.details).map(([key, { from, to }]) => (
            <span key={key} className="mr-3">
              {key}: <span className="text-red-500 line-through">{String(from)}</span>{' '}
              <span className="text-green-600">{String(to)}</span>
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
