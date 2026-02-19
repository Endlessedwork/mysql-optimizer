"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useConnection } from '@/hooks/useConnections';
import { getConnectionSchema, getConnectionSchemaHistory } from '@/lib/api-client';
import { buildTableViews } from '@/lib/schema-transforms';
import { SchemaTableList } from '@/components/schema/SchemaTableList';
import { SchemaIndexSummary } from '@/components/schema/SchemaIndexSummary';
import { SchemaDiffViewer } from '@/components/schema/SchemaDiffViewer';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, Table2, GitCompare, Database, Download, ChevronDown } from 'lucide-react';
import { exportToDBML, exportToSQL, exportToJSON, downloadFile } from '@/lib/schema-export';
import dynamic from 'next/dynamic';

// Dynamic import for ER Diagram (heavy dependency)
const SchemaERDiagram = dynamic(
  () => import('@/components/schema/SchemaERDiagram').then(mod => ({ default: mod.SchemaERDiagram })),
  { loading: () => <div className="h-[600px] flex items-center justify-center"><LoadingSpinner size="md" /></div>, ssr: false }
);

type TabId = 'tables' | 'er-diagram' | 'diff';

const tabs: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
  { id: 'tables', label: 'Tables', icon: Table2 },
  { id: 'er-diagram', label: 'ER Diagram', icon: Database },
  { id: 'diff', label: 'Schema History', icon: GitCompare },
];

export default function SchemaPage() {
  const { id } = useParams();
  const router = useRouter();
  const connectionId = id as string;

  const [activeTab, setActiveTab] = useState<TabId>('tables');
  const [showExport, setShowExport] = useState(false);

  const { data: connection, isLoading: connLoading } = useConnection(connectionId);

  const { data: schema, isLoading: schemaLoading, error: schemaError } = useQuery({
    queryKey: ['connection-schema', connectionId],
    queryFn: async () => {
      const response = await getConnectionSchema(connectionId);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch schema');
      }
      return response.data!;
    },
    enabled: !!connectionId,
  });

  const { data: history } = useQuery({
    queryKey: ['connection-schema-history', connectionId],
    queryFn: async () => {
      const response = await getConnectionSchemaHistory(connectionId);
      if (!response.ok) return [];
      return response.data || [];
    },
    enabled: !!connectionId && activeTab === 'diff',
  });

  const tableViews = useMemo(() => {
    if (!schema) return [];
    return buildTableViews(schema);
  }, [schema]);

  if (connLoading || schemaLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (schemaError) {
    const errMsg = schemaError instanceof Error ? schemaError.message : 'Failed to load schema';
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push(`/admin/connections/${connectionId}`)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Connection
        </button>
        <Card>
          <div className="text-center py-12">
            <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-slate-700 mb-2">No Schema Data Available</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {errMsg}. Please run a scan on this connection first.
            </p>
            <Button
              variant="primary"
              className="mt-4"
              onClick={() => router.push(`/admin/connections/${connectionId}`)}
            >
              Go Back
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Back */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/admin/connections/${connectionId}`)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <span className="text-slate-300">/</span>
          <h1 className="text-xl font-bold text-slate-800">
            {connection?.name || 'Connection'} — Schema Browser
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {schema?.scanRunCreatedAt && (
            <span className="text-xs text-slate-400">
              Last scan: {new Date(schema.scanRunCreatedAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
            </span>
          )}
          {/* Export dropdown */}
          {tableViews.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowExport(prev => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export
                <ChevronDown className="w-3 h-3" />
              </button>
              {showExport && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExport(false)} />
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
                    <ExportOption
                      label="DBML"
                      description="For dbdiagram.io"
                      onClick={() => {
                        const dbName = connection?.database || connection?.databaseName || 'database';
                        const content = exportToDBML(tableViews, dbName);
                        downloadFile(content, `${dbName}.dbml`, 'text/plain');
                        setShowExport(false);
                      }}
                    />
                    <ExportOption
                      label="SQL (CREATE TABLE)"
                      description="MySQL DDL statements"
                      onClick={() => {
                        const dbName = connection?.database || connection?.databaseName || 'database';
                        const content = exportToSQL(tableViews, dbName);
                        downloadFile(content, `${dbName}.sql`, 'text/sql');
                        setShowExport(false);
                      }}
                    />
                    <ExportOption
                      label="JSON"
                      description="Structured data"
                      onClick={() => {
                        const dbName = connection?.database || connection?.databaseName || 'database';
                        const content = exportToJSON(tableViews, dbName);
                        downloadFile(content, `${dbName}-schema.json`, 'application/json');
                        setShowExport(false);
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Tables" value={tableViews.length} />
        <StatCard label="Columns" value={tableViews.reduce((s, t) => s + t.columns.length, 0)} />
        <StatCard label="Indexes" value={tableViews.reduce((s, t) => s + t.indexes.length, 0)} />
        <StatCard label="Foreign Keys" value={tableViews.reduce((s, t) => s + t.foreignKeys.length, 0)} />
        <StatCard label="Views" value={Array.isArray(schema?.views) ? schema.views.length : 0} />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'tables' && (
          <div className="space-y-8">
            <SchemaTableList tables={tableViews} />
            <SchemaIndexSummary tables={tableViews} />
          </div>
        )}
        {activeTab === 'er-diagram' && <SchemaERDiagram tables={tableViews} />}
        {activeTab === 'diff' && (
          <SchemaDiffViewer
            connectionId={connectionId}
            snapshots={history || []}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-0.5">{value.toLocaleString()}</p>
    </div>
  );
}

function ExportOption({ label, description, onClick }: { label: string; description: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors"
    >
      <span className="text-sm font-medium text-slate-700 block">{label}</span>
      <span className="text-xs text-slate-400">{description}</span>
    </button>
  );
}
