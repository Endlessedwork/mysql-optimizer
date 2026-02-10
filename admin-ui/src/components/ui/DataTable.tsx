import React from 'react';
import { Loader2, Inbox } from 'lucide-react';

interface Column<T> {
  key: string;
  title: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
}

const DataTable = <T,>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  emptyDescription = 'There are no items to display at this time.',
  onRowClick,
}: DataTableProps<T>) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        <p className="mt-3 text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Inbox className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-base font-medium text-slate-900">{emptyMessage}</p>
        <p className="mt-1 text-sm text-slate-500">{emptyDescription}</p>
      </div>
    );
  }

  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-slate-200">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`
                  px-6 py-3
                  text-xs font-medium text-slate-500 uppercase tracking-wider
                  bg-slate-50
                  ${getAlignClass(column.align)}
                `}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={index}
              className={`
                border-b border-slate-100
                transition-colors
                ${onRowClick ? 'hover:bg-slate-50 cursor-pointer' : ''}
              `}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <td
                  key={`${index}-${column.key}`}
                  className={`
                    px-6 py-4
                    text-sm text-slate-700
                    ${getAlignClass(column.align)}
                  `}
                >
                  {column.render
                    ? column.render(row[column.key as keyof T], row)
                    : (row[column.key as keyof T] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
export { DataTable };
export type { Column, DataTableProps };
