import { useState, useEffect } from 'react';
import { getExecutions, getExecution } from '@/lib/api-client';
import { Execution, ExecutionFilter } from '@/lib/types';

export const useExecutions = (filters?: ExecutionFilter) => {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExecutions = async () => {
      try {
        setLoading(true);
        const response = await getExecutions();
        if (!response.ok) {
          throw new Error(response.error || 'Failed to fetch executions');
        }
        setExecutions(response.data || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch executions');
        console.error('Error fetching executions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchExecutions();
  }, [filters]);

  return { executions, loading, error };
};

export const useExecution = (id: string) => {
  const [execution, setExecution] = useState<Execution | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExecution = async () => {
      try {
        setLoading(true);
        const response = await getExecution(id);
        if (!response.ok) {
          throw new Error(response.error || 'Failed to fetch execution');
        }
        setExecution(response.data!);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch execution');
        console.error('Error fetching execution:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchExecution();
    }
  }, [id]);

  return { execution, loading, error };
};