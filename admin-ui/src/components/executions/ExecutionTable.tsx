"use client";

import { useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { Execution } from '@/lib/types';
import { ExecutionStatusBadge } from './ExecutionStatusBadge';
import { formatDate } from '@/lib/utils';

interface ExecutionTableProps {
  executions: Execution[];
  loading: boolean;
  onRowClick?: (execution: Execution) => void;
}

export const ExecutionTable = ({ executions, loading, onRowClick }: ExecutionTableProps) => {
  const columns = [
    {
      key: 'connectionName',
      label: 'Connection',
      render: (execution: Execution) => execution.connectionId,
    },
    {
      key: 'table',
      label: 'Table',
      render: (execution: Execution) => execution.id, // ใช้ id แทนชื่อ table ชั่วคราว
    },
    {
      key: 'index',
      label: 'Index',
      render: (execution: Execution) => execution.id, // ใช้ id แทนชื่อ index ชั่วคราว
    },
    {
      key: 'status',
      label: 'Status',
      render: (execution: Execution) => <ExecutionStatusBadge status={execution.status} />,
    },
    {
      key: 'startedAt',
      label: 'Started At',
      render: (execution: Execution) => formatDate(execution.startedAt),
    },
    {
      key: 'duration',
      label: 'Duration',
      render: (execution: Execution) => {
        if (!execution.completedAt) return 'Running';
        const start = new Date(execution.startedAt);
        const end = new Date(execution.completedAt);
        const diff = end.getTime() - start.getTime();
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
      },
    },
    {
      key: 'verified',
      label: 'Verified',
      render: (execution: Execution) => {
        // แสดงสถานะ verification ที่จำเป็น
        return 'N/A';
      },
    },
  ];

  return (
    <DataTable
      data={executions}
      columns={columns}
      loading={loading}
      onRowClick={onRowClick}
      emptyStateMessage="No executions found"
    />
  );
};