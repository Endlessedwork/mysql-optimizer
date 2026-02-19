"use client";

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { TableView } from '@/lib/types';

interface SchemaIndexSummaryProps {
  tables: TableView[];
}

interface IndexRow {
  table: string;
  name: string;
  unique: boolean;
  type: string;
  columns: string[];
  isPrimary: boolean;
  isFirstInGroup: boolean;
  groupSize: number;
}

function buildIndexRows(tables: TableView[], search: string): IndexRow[] {
  const q = search.toLowerCase().trim();

  const groups = tables
    .filter(t => t.indexes.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(table => {
      const indexes = table.indexes.map(idx => ({
        table: table.name,
        name: idx.name,
        unique: idx.unique,
        type: idx.type,
        columns: idx.columns,
        isPrimary: idx.name === 'PRIMARY',
        isFirstInGroup: false,
        groupSize: 0,
      }));
      // PRIMARY first, then alphabetical
      indexes.sort((a, b) => {
        if (a.isPrimary) return -1;
        if (b.isPrimary) return 1;
        return a.name.localeCompare(b.name);
      });
      return indexes;
    });

  // Flatten and mark first-in-group
  const rows: IndexRow[] = [];
  for (const group of groups) {
    for (let i = 0; i < group.length; i++) {
      rows.push({
        ...group[i],
        isFirstInGroup: i === 0,
        groupSize: group.length,
      });
    }
  }

  if (!q) return rows;

  return rows.filter(idx =>
    idx.table.toLowerCase().includes(q) ||
    idx.name.toLowerCase().includes(q) ||
    idx.columns.some(c => c.toLowerCase().includes(q))
  );
}

export function SchemaIndexSummary({ tables }: SchemaIndexSummaryProps) {
  const [search, setSearch] = useState('');

  const rows = useMemo(() => buildIndexRows(tables, search), [tables, search]);

  const allIndexes = tables.flatMap(t => t.indexes);
  const totalIndexes = allIndexes.length;
  const primaryCount = allIndexes.filter(i => i.name === 'PRIMARY').length;
  const uniqueCount = allIndexes.filter(i => i.unique).length;
  const compositeCount = allIndexes.filter(i => i.columns.length > 1).length;

  // Track alternating group color
  let groupColorIndex = 0;
  let lastTable = '';

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700">Index Summary</h3>

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-medium">
          {totalIndexes} indexes
        </span>
        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full">
          {primaryCount} primary
        </span>
        <span className="px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full">
          {uniqueCount} unique
        </span>
        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full">
          {compositeCount} composite
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search indexes, tables, or columns..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      {/* Index table */}
      <div className="border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left">
              <th className="px-3 py-2.5 text-xs font-medium text-slate-500 w-[160px]">Table</th>
              <th className="px-3 py-2.5 text-xs font-medium text-slate-500 w-[200px]">Index Name</th>
              <th className="px-3 py-2.5 text-xs font-medium text-slate-500 w-[70px]">Type</th>
              <th className="px-3 py-2.5 text-xs font-medium text-slate-500 w-[70px]">Unique</th>
              <th className="px-3 py-2.5 text-xs font-medium text-slate-500">Column Order</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((idx) => {
              // Alternate background per table group
              if (idx.table !== lastTable) {
                groupColorIndex++;
                lastTable = idx.table;
              }
              const isEvenGroup = groupColorIndex % 2 === 0;

              return (
                <tr
                  key={`${idx.table}::${idx.name}`}
                  className={`${isEvenGroup ? 'bg-slate-50/60' : 'bg-white'} ${idx.isFirstInGroup ? 'border-t border-slate-200' : 'border-t border-slate-100'}`}
                >
                  {/* Table name — only show on first row of group */}
                  <td className="px-3 py-2 align-top">
                    {idx.isFirstInGroup ? (
                      <span className="font-mono text-xs font-semibold text-slate-700">{idx.table}</span>
                    ) : null}
                  </td>

                  {/* Index name */}
                  <td className="px-3 py-2 align-top">
                    <div className="flex items-center gap-1.5">
                      {idx.isPrimary && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium shrink-0">PK</span>
                      )}
                      <span className={`font-mono text-xs ${idx.isPrimary ? 'text-amber-700 font-semibold' : 'text-slate-800'}`}>
                        {idx.name}
                      </span>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-3 py-2 text-xs text-slate-500 align-top">{idx.type}</td>

                  {/* Unique */}
                  <td className="px-3 py-2 align-top">
                    {idx.unique ? (
                      <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">YES</span>
                    ) : (
                      <span className="text-xs text-slate-300">NO</span>
                    )}
                  </td>

                  {/* Column Order */}
                  <td className="px-3 py-2 align-top">
                    <div className="flex items-center gap-0.5 flex-wrap font-mono text-xs">
                      {idx.columns.map((col, i) => (
                        <span key={col} className="flex items-center">
                          {i > 0 && <span className="text-slate-300 mx-1">&rarr;</span>}
                          <span className="text-slate-400 text-[10px] mr-0.5">{i + 1}.</span>
                          <span className={i === 0 ? 'text-blue-700 font-medium' : 'text-slate-600'}>{col}</span>
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                  {search ? 'No indexes match your search.' : 'No indexes found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
