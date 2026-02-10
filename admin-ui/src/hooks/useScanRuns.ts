import { useQuery } from '@tanstack/react-query';
import { getScanRuns, getScanRun } from '@/lib/api-client';
import type { ScanRun } from '@/lib/types';

export const useScanRuns = (filters?: { connectionProfileId?: string; status?: string }) => {
  return useQuery<ScanRun[]>({
    queryKey: ['scan-runs', filters],
    queryFn: async () => {
      const response = await getScanRuns(filters);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch scan runs');
      }
      return response.data || [];
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds to show progress
  });
};

export const useScanRun = (id: string) => {
  return useQuery<ScanRun>({
    queryKey: ['scan-run', id],
    queryFn: async () => {
      const response = await getScanRun(id);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch scan run');
      }
      return response.data!;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      // Stop polling if completed or failed
      const status = query.state.data?.status;
      if (status === 'completed' || status === 'failed') {
        return false;
      }
      return 3000; // Poll every 3 seconds while running
    },
  });
};
