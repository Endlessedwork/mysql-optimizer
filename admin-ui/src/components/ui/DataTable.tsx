import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface Column<T> {
  key: string;
  title: string;
  render?: (value: T, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

const DataTable = <T,>({ 
  columns, 
  data, 
  loading = false, 
  emptyMessage = 'No data available',
  onRowClick 
}: DataTableProps<T>) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th 
                key={column.key}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, index) => (
            <tr 
              key={index} 
              className={onRowClick ? "hover:bg-gray-50 cursor-pointer" : ""}
              onClick={() => onRowClick && onRowClick(row)}
            >
              {columns.map((column) => (
                <td 
                  key={`${index}-${column.key}`} 
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                >
                  {column.render ? column.render(row[column.key as keyof T], row) : (row[column.key as keyof T] as React.ReactNode)}
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