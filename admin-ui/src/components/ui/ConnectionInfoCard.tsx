'use client';

import { Database } from 'lucide-react';
import Link from 'next/link';

interface ConnectionInfoCardProps {
  connectionId?: string;
  connectionName?: string;
  databaseName?: string;
}

export const ConnectionInfoCard = ({
  connectionId,
  connectionName,
  databaseName,
}: ConnectionInfoCardProps) => {
  if (!connectionName && !connectionId) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg">
      <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center">
        <Database className="w-5 h-5 text-teal-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={connectionId ? `/admin/connections/${connectionId}` : '/admin/connections'}
            className="font-medium text-slate-900 hover:text-teal-600 transition-colors truncate"
          >
            {connectionName || 'Unknown Connection'}
          </Link>
        </div>
        {databaseName && (
          <p className="text-sm text-slate-500 truncate">
            Database: <span className="font-mono">{databaseName}</span>
          </p>
        )}
      </div>
    </div>
  );
};
