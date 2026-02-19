"use client";

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Key, Link2, Hash, Search, ArrowRight } from 'lucide-react';
import type { TableView } from '@/lib/types';
import { formatBytes } from '@/lib/schema-transforms';

interface SchemaTableListProps {
  tables: TableView[];
}

export function SchemaTableList({ tables }: SchemaTableListProps) {
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return tables;
    const q = search.toLowerCase();
    return tables.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.columns.some(c => (c.COLUMN_NAME || '').toLowerCase().includes(q))
    );
  }, [tables, search]);

  const toggleTable = (name: string) => {
    setExpandedTables(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search tables or columns..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-slate-500">
        <span>{filtered.length} tables</span>
        <span>{filtered.reduce((sum, t) => sum + t.columns.length, 0)} columns</span>
        <span>{filtered.reduce((sum, t) => sum + t.indexes.length, 0)} indexes</span>
        <span>{filtered.reduce((sum, t) => sum + t.foreignKeys.length, 0)} foreign keys</span>
      </div>

      {/* Table list */}
      <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
        {/* Column header */}
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200">
          <span className="w-4 shrink-0" />
          <span className="text-xs font-medium text-slate-500 min-w-0 flex-1">Table Name</span>
          <div className="ml-auto grid grid-cols-6 gap-x-2 text-xs text-right font-medium text-slate-500 shrink-0" style={{ width: '360px' }}>
            <span>Engine</span>
            <span>Rows</span>
            <span>Size</span>
            <span>Cols</span>
            <span>Indexes</span>
            <span>FKs</span>
          </div>
        </div>
        {filtered.map(table => {
          const expanded = expandedTables.has(table.name);
          return (
            <div key={table.name}>
              {/* Table header row */}
              <button
                onClick={() => toggleTable(table.name)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
              >
                {expanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className="font-mono text-sm font-semibold text-slate-800 min-w-0 truncate">{table.name}</span>
                <div className="ml-auto grid grid-cols-6 gap-x-2 text-xs text-right shrink-0" style={{ width: '360px' }}>
                  <span className="text-slate-400">{table.engine}</span>
                  <span className="text-slate-400">{table.rows.toLocaleString()}</span>
                  <span className="text-slate-400">{formatBytes(table.dataSize)}</span>
                  <span className="text-teal-600">{table.columns.length} cols</span>
                  <span className="text-blue-600">{table.indexes.length} idx</span>
                  <span className={table.foreignKeys.length > 0 ? 'text-purple-600' : 'text-slate-300'}>
                    {table.foreignKeys.length > 0 ? `${table.foreignKeys.length} FK` : '—'}
                  </span>
                </div>
              </button>

              {/* Expanded detail */}
              {expanded && (
                <div className="bg-slate-50/50 px-4 pb-4 pt-1 space-y-4">
                  {/* Columns */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Columns</h4>
                    <div className="bg-white rounded-md border border-slate-200 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-left">
                            <th className="px-3 py-2 text-xs font-medium text-slate-500 w-8">#</th>
                            <th className="px-3 py-2 text-xs font-medium text-slate-500">Name</th>
                            <th className="px-3 py-2 text-xs font-medium text-slate-500">Data Type</th>
                            <th className="px-3 py-2 text-xs font-medium text-slate-500">Nullable</th>
                            <th className="px-3 py-2 text-xs font-medium text-slate-500">Attributes</th>
                            <th className="px-3 py-2 text-xs font-medium text-slate-500">Default</th>
                            <th className="px-3 py-2 text-xs font-medium text-slate-500">Comment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {table.columns.map((col: any, i: number) => (
                            <tr key={col.COLUMN_NAME || col.column_name} className="hover:bg-slate-50/50">
                              <td className="px-3 py-1.5 text-slate-400 text-xs">{i + 1}</td>
                              <td className="px-3 py-1.5">
                                <div className="flex items-center gap-1.5 font-mono text-slate-800">
                                  {col._isPK && <Key className="w-3 h-3 text-amber-500 shrink-0" />}
                                  {col._isFK && !col._isPK && <Link2 className="w-3 h-3 text-purple-500 shrink-0" />}
                                  {col._isIndexed && !col._isPK && !col._isFK && <Hash className="w-3 h-3 text-blue-400 shrink-0" />}
                                  {col.COLUMN_NAME || col.column_name}
                                </div>
                                {/* FK reference detail */}
                                {col._fkRef && (
                                  <div className="flex items-center gap-1 mt-0.5 ml-[18px] text-[10px] text-purple-600">
                                    <ArrowRight className="w-2.5 h-2.5" />
                                    <span className="font-mono">
                                      {col._fkRef.REFERENCED_TABLE_NAME || col._fkRef.referenced_table_name}
                                      .{col._fkRef.REFERENCED_COLUMN_NAME || col._fkRef.referenced_column_name}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-1.5 text-slate-600 font-mono text-xs">
                                {col.COLUMN_TYPE || col.DATA_TYPE || col.data_type || '-'}
                              </td>
                              <td className="px-3 py-1.5">
                                <span className={`text-xs ${col.IS_NULLABLE === 'YES' ? 'text-amber-600' : 'text-slate-400'}`}>
                                  {col.IS_NULLABLE === 'YES' || col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}
                                </span>
                              </td>
                              <td className="px-3 py-1.5">
                                <div className="flex items-center gap-1 flex-wrap">
                                  {col._isPK && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">PK</span>
                                  )}
                                  {col._isFK && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">FK</span>
                                  )}
                                  {col._isIndexed && !col._isPK && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">IDX</span>
                                  )}
                                  {!col._isPK && !col._isFK && !col._isIndexed && (
                                    <span className="text-xs text-slate-300">—</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-1.5 text-xs text-slate-500 font-mono">
                                {col.COLUMN_DEFAULT || col.column_default
                                  ? <span>{col.COLUMN_DEFAULT || col.column_default}</span>
                                  : <span className="text-slate-300">—</span>
                                }
                              </td>
                              <td className="px-3 py-1.5 text-xs text-slate-500">
                                {col.COLUMN_COMMENT || col.column_comment || <span className="text-slate-300">—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Indexes */}
                  {table.indexes.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Indexes</h4>
                      <div className="bg-white rounded-md border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 text-left">
                              <th className="px-3 py-2 text-xs font-medium text-slate-500">Name</th>
                              <th className="px-3 py-2 text-xs font-medium text-slate-500">Type</th>
                              <th className="px-3 py-2 text-xs font-medium text-slate-500">Unique</th>
                              <th className="px-3 py-2 text-xs font-medium text-slate-500">Columns</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {table.indexes.map(idx => (
                              <tr key={idx.name} className="hover:bg-slate-50/50">
                                <td className="px-3 py-1.5 font-mono text-slate-800 text-xs">{idx.name}</td>
                                <td className="px-3 py-1.5 text-xs text-slate-500">{idx.type}</td>
                                <td className="px-3 py-1.5">
                                  {idx.unique ? (
                                    <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">UNIQUE</span>
                                  ) : (
                                    <span className="text-xs text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-1.5 font-mono text-xs text-slate-600">
                                  {idx.columns.join(', ')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Foreign Keys */}
                  {table.foreignKeys.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Foreign Keys</h4>
                      <div className="bg-white rounded-md border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 text-left">
                              <th className="px-3 py-2 text-xs font-medium text-slate-500">Constraint</th>
                              <th className="px-3 py-2 text-xs font-medium text-slate-500">Column</th>
                              <th className="px-3 py-2 text-xs font-medium text-slate-500">References</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {table.foreignKeys.map(fk => (
                              <tr key={fk.CONSTRAINT_NAME} className="hover:bg-slate-50/50">
                                <td className="px-3 py-1.5 font-mono text-xs text-slate-600">{fk.CONSTRAINT_NAME}</td>
                                <td className="px-3 py-1.5 font-mono text-xs text-slate-800">{fk.COLUMN_NAME}</td>
                                <td className="px-3 py-1.5 flex items-center gap-1 font-mono text-xs text-purple-700">
                                  <Link2 className="w-3 h-3" />
                                  {fk.REFERENCED_TABLE_NAME}.{fk.REFERENCED_COLUMN_NAME}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-slate-400">
            {search ? 'No tables match your search.' : 'No tables found in schema.'}
          </div>
        )}
      </div>
    </div>
  );
}
