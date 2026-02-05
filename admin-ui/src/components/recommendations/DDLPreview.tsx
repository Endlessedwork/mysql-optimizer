"use client";

import { useState } from 'react';

interface DDLPreviewProps {
  sql: string;
}

export const DDLPreview = ({ sql }: DDLPreviewProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">DDL Statement</h3>
        <button
          onClick={handleCopy}
          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="p-6">
        <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
          <code>{sql}</code>
        </pre>
      </div>
    </div>
  );
};