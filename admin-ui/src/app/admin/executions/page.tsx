'use client';

import { useState, useEffect } from 'react';
import { useExecutions } from '@/hooks/useExecutions';
import { ExecutionTable } from '@/components/executions/ExecutionTable';
import { ExecutionStatusBadge } from '@/components/executions/ExecutionStatusBadge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';

export default function ExecutionsPage() {
  const [filters, setFilters] = useState({
    status: '',
    connectionId: '',
    startDate: '',
    endDate: '',
  });
  
  const { executions, loading, error } = useExecutions(filters);
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  const handleResetFilters = () => {
    setFilters({
      status: '',
      connectionId: '',
      startDate: '',
      endDate: '',
    });
  };
  
  const handleApplyFilters = () => {
    // Filters are applied automatically via useEffect in useExecutions hook
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Executions</h1>
        <Button variant="primary">New Execution</Button>
      </div>
      
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="rolled_back">Rolled Back</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Connection</label>
            <select
              name="connectionId"
              value={filters.connectionId}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded"
            >
              <option value="">All Connections</option>
              <option value="conn1">Connection 1</option>
              <option value="conn2">Connection 2</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        
        <div className="flex space-x-2 mb-4">
          <Button variant="secondary" onClick={handleApplyFilters}>Apply Filters</Button>
          <Button variant="outline" onClick={handleResetFilters}>Reset</Button>
        </div>
      </Card>
      
      <Card>
        <ExecutionTable 
          executions={executions} 
          loading={loading} 
          onRowClick={(execution) => {
            // นำทางไปยังหน้ารายละเอียด
            window.location.href = `/admin/executions/${execution.id}`;
          }}
        />
      </Card>
    </div>
  );
}