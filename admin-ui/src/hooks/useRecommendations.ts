import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRecommendations,
  getRecommendation,
  rejectRecommendation
} from '@/lib/api-client';
import { Recommendation, RecommendationDetail, RecommendationStatus } from '@/lib/types';

// Fetch all recommendations with filters
export const useRecommendations = (
  statusFilter: RecommendationStatus | 'all' = 'all',
  connectionFilter: string | null = null,
  includeArchived: boolean = false
) => {
  return useQuery<Recommendation[]>({
    queryKey: ['recommendations', statusFilter, connectionFilter, includeArchived],
    queryFn: async () => {
      const response = await getRecommendations(
        connectionFilter || undefined,
        statusFilter !== 'all' ? statusFilter : undefined,
        includeArchived
      );
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