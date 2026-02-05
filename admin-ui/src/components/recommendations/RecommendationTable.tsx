"use client";

import { useState } from 'react';
import { Recommendation } from '@/lib/types';
import DataTable from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { RecommendationStatusBadge } from './RecommendationStatusBadge';

interface RecommendationTableProps {
  recommendations: Recommendation[];
  onRowClick: (id: string) => void;
  loading: boolean;
  emptyStateMessage?: string;
}

export const RecommendationTable = ({ 
  recommendations, 
  onRowClick,
  loading,
  emptyStateMessage = 'ไม่มี recommendations ที่ตรงกับเงื่อนไข'
}: RecommendationTableProps) => {
  const [selectedStatus, setSelectedStatus] = useState<'all' | Recommendation['status']>('all');
  const [selectedConnection, setSelectedConnection] = useState<string>('all');

  const columns = [
    {
      key: 'connection',
      label: 'Connection',
      render: (recommendation: Recommendation) => (
        <div className="font-medium">{recommendation.connectionId}</div>
      ),
    },
    {
      key: 'table',
      label: 'Table',
      render: (recommendation: Recommendation) => (
        <div className="font-medium">table_name</div>
      ),
    },
    {
      key: 'indexType',
      label: 'Index Type',
      render: (recommendation: Recommendation) => (
        <div className="font-medium">btree</div>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (recommendation: Recommendation) => (
        <div className="font-medium">{recommendation.impact}</div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (recommendation: Recommendation) => (
        <RecommendationStatusBadge status={recommendation.status} />
      ),
    },
    {
      key: 'impact',
      label: 'Impact',
      render: (recommendation: Recommendation) => (
        <div className="font-medium">{recommendation.impact}</div>
      ),
    },
    {
      key: 'created',
      label: 'Created',
      render: (recommendation: Recommendation) => (
        <div className="text-sm text-gray-500">
          {new Date(recommendation.createdAt).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (recommendation: Recommendation) => (
        <Button 
          variant="outline" 
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onRowClick(recommendation.id);
          }}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      data={recommendations}
      columns={columns}
      loading={loading}
      emptyStateMessage={emptyStateMessage}
      onRowClick={onRowClick}
      filters={[
        {
          key: 'status',
          label: 'Status',
          options: [
            { value: 'all', label: 'All Statuses' },
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'executed', label: 'Executed' },
            { value: 'failed', label: 'Failed' },
            { value: 'rejected', label: 'Rejected' },
          ],
          value: selectedStatus,
          onChange: (value) => setSelectedStatus(value as any),
        },
        {
          key: 'connection',
          label: 'Connection',
          options: [
            { value: 'all', label: 'All Connections' },
            { value: 'conn1', label: 'Connection 1' },
            { value: 'conn2', label: 'Connection 2' },
          ],
          value: selectedConnection,
          onChange: (value) => setSelectedConnection(value),
        },
      ]}
    />
  );
};