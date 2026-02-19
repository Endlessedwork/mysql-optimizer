"use client";

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Key, Hash } from 'lucide-react';
import type { TableView } from '@/lib/types';

interface TableNodeProps {
  data: {
    table: TableView;
    columnCount: number;
    indexCount: number;
  };
}

const MAX_VISIBLE_COLUMNS = 8;

export const TableNode = memo(function TableNode({ data }: TableNodeProps) {
  const { table } = data;
  const visibleColumns = table.columns.slice(0, MAX_VISIBLE_COLUMNS);
  const hasMore = table.columns.length > MAX_VISIBLE_COLUMNS;

  return (
    <div className="bg-white border-2 border-slate-300 rounded-lg shadow-md min-w-[240px] overflow-hidden">
      <Handle type="target" position={Position.Left} className="!bg-purple-500 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-teal-500 !w-2 !h-2" />

      {/* Table header */}
      <div className="bg-teal-600 text-white px-3 py-2 flex items-center justify-between">
        <span className="font-mono font-semibold text-xs">{table.name}</span>
        <span className="text-[10px] opacity-75">{table.engine}</span>
      </div>

      {/* Columns */}
      <div className="divide-y divide-slate-100">
        {visibleColumns.map(col => (
          <div key={col.COLUMN_NAME} className="px-3 py-1 flex items-center gap-2 text-xs">
            {col.COLUMN_KEY === 'PRI' && <Key className="w-3 h-3 text-amber-500 shrink-0" />}
            {col.COLUMN_KEY === 'MUL' && <Hash className="w-3 h-3 text-blue-400 shrink-0" />}
            {col.COLUMN_KEY === 'UNI' && <Key className="w-3 h-3 text-teal-500 shrink-0" />}
            {!col.COLUMN_KEY && <span className="w-3 shrink-0" />}
            <span className="font-mono text-slate-700 truncate">{col.COLUMN_NAME}</span>
            <span className="ml-auto text-slate-400 font-mono text-[10px] shrink-0">
              {col.COLUMN_TYPE}
            </span>
          </div>
        ))}
        {hasMore && (
          <div className="px-3 py-1 text-[10px] text-slate-400 text-center">
            +{table.columns.length - MAX_VISIBLE_COLUMNS} more columns
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="bg-slate-50 px-3 py-1.5 flex items-center gap-3 text-[10px] text-slate-400 border-t border-slate-200">
        <span>{table.rows.toLocaleString()} rows</span>
        <span>{table.indexes.length} idx</span>
        {table.foreignKeys.length > 0 && (
          <span className="text-purple-500">{table.foreignKeys.length} FK</span>
        )}
      </div>
    </div>
  );
});
