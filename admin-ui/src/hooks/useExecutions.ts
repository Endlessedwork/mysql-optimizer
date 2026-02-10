import { useState, useEffect, useCallback } from 'react';
import { getExecutions, getExecution } from '@/lib/api-client';
import { Execution, ExecutionFilter } from '@/lib/types';

export const useExecutions = (filters?: ExecutionFilter) => {
  const [data, setData] = useState<Execution[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExecutions = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getExecutions(
        filters?.connectionId || undefined,
        filters?.status || undefined
      );
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch executions');
      }
      setData(response.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch executions');
      console.error('Error fetching executions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters?.connectionId, filters?.status]);

  useEffect(() => {
    fetchExecutions();
  }, [fetchExecutions]);

  return { data, isLoading, error, refetch: fetchExecutions };
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