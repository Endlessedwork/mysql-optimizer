import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getRecommendations, 
  getRecommendation, 
  approveRecommendation, 
  scheduleRecommendation,
  rejectRecommendation
} from '@/lib/api-client';
import { Recommendation, RecommendationDetail } from '@/lib/types';

// Fetch all recommendations with filters
export const useRecommendations = (
  statusFilter: 'pending' | 'approved' | 'scheduled' | 'executed' | 'failed' | 'all' = 'all',
  connectionFilter: string | null = null
) => {
  return useQuery<Recommendation[]>({
    queryKey: ['recommendations', statusFilter, connectionFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (connectionFilter) {
        params.append('connectionId', connectionFilter);
      }
      
      const response = await getRecommendations(connectionFilter ? connectionFilter : undefined);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch recommendations');
      }
      return response.data || [];
    },
  });
};

// Fetch single recommendation detail
export const useRecommendation = (id: string) => {
  return useQuery<RecommendationDetail>({
    queryKey: ['recommendation', id],
    queryFn: async () => {
      const response = await getRecommendation(id);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch recommendation');
      }
      return response.data!;
    },
    enabled: !!id,
  });
};

// Mutation for approving recommendation
export const useApproveRecommendation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await approveRecommendation(id);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to approve recommendation');
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['recommendation'] });
    },
  });
};

// Mutation for scheduling recommendation
export const useScheduleRecommendation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      scheduledAt 
    }: { 
      id: string; 
      scheduledAt: string; 
    }) => {
      const response = await scheduleRecommendation(id, scheduledAt);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to schedule recommendation');
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['recommendation'] });
    },
  });
};

// Mutation for rejecting recommendation
export const useRejectRecommendation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await rejectRecommendation(id);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to reject recommendation');
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['recommendation'] });
    },
  });
};