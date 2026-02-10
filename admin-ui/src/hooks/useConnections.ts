import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getConnections, getConnection, updateConnectionStatus, updateConnection, deleteConnection, requestConnectionScan } from '@/lib/api-client';
import type { CreateConnectionInput } from '@/lib/api-client';
import { Connection } from '@/lib/types';

export const useConnections = () => {
  return useQuery<Connection[]>({
    queryKey: ['connections'],
    queryFn: async () => {
      const response = await getConnections();
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch connections');
      }
      return response.data || [];
    },
  });
};

export const useConnection = (id: string) => {
  return useQuery<Connection>({
    queryKey: ['connections', id],
    queryFn: async () => {
      const response = await getConnection(id);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch connection');
      }
      return response.data!;
    },
    enabled: !!id,
  });
};

export const useUpdateConnectionStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'disabled' }) => {
      const response = await updateConnectionStatus(id, status);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to update connection status');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['connections', 'status'] });
    },
  });
};

export const useUpdateConnection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<CreateConnectionInput> }) => {
      const response = await updateConnection(id, input);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to update connection');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });
};

export const useDeleteConnection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await deleteConnection(id);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to delete connection');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });
};

/** Request a scan for a connection (agent will pick up when running) */
export const useRequestConnectionScan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await requestConnectionScan(id);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to request scan');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });
};