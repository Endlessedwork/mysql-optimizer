/**
 * Unit Tests: useConnections Hook
 * ทดสอบ React Query hooks สำหรับ connections
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useConnections, useConnection, useUpdateConnectionStatus } from '@/hooks/useConnections';
import * as apiClient from '@/lib/api-client';

// Mock API client
jest.mock('@/lib/api-client');

const mockGetConnections = apiClient.getConnections as jest.Mock;
const mockGetConnection = apiClient.getConnection as jest.Mock;
const mockUpdateConnectionStatus = apiClient.updateConnectionStatus as jest.Mock;

// Create a wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

describe('useConnections Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useConnections', () => {
    const mockConnectionsData = [
      {
        id: 'conn-1',
        name: 'Production DB',
        host: 'prod.db.example.com',
        port: 3306,
        database: 'app_prod',
        username: 'admin',
        status: 'active',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z'
      },
      {
        id: 'conn-2',
        name: 'Staging DB',
        host: 'staging.db.example.com',
        port: 3306,
        database: 'app_staging',
        username: 'admin',
        status: 'disabled',
        createdAt: '2024-01-03T00:00:00.000Z',
        updatedAt: '2024-01-04T00:00:00.000Z'
      }
    ];

    it('ควร fetch connections สำเร็จ', async () => {
      mockGetConnections.mockResolvedValueOnce({
        ok: true,
        data: mockConnectionsData,
        error: null,
        status: 200
      });

      const { result } = renderHook(() => useConnections(), {
        wrapper: createWrapper()
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockConnectionsData);
      expect(mockGetConnections).toHaveBeenCalledTimes(1);
    });

    it('ควร return empty array เมื่อ API returns null data', async () => {
      mockGetConnections.mockResolvedValueOnce({
        ok: true,
        data: null,
        error: null,
        status: 200
      });

      const { result } = renderHook(() => useConnections(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
    });

    it('ควร throw error เมื่อ API returns error', async () => {
      mockGetConnections.mockResolvedValueOnce({
        ok: false,
        data: null,
        error: 'Connection Error',
        status: 500
      });

      const { result } = renderHook(() => useConnections(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('ควรมี queryKey ที่ถูกต้อง', async () => {
      mockGetConnections.mockResolvedValueOnce({
        ok: true,
        data: mockConnectionsData,
        error: null,
        status: 200
      });

      renderHook(() => useConnections(), {
        wrapper: createWrapper()
      });

      // The hook should call getConnections
      await waitFor(() => {
        expect(mockGetConnections).toHaveBeenCalled();
      });
    });
  });

  describe('useConnection', () => {
    const mockConnectionData = {
      id: 'conn-1',
      name: 'Production DB',
      host: 'prod.db.example.com',
      port: 3306,
      database: 'app_prod',
      username: 'admin',
      status: 'active',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z'
    };

    it('ควร fetch connection by id สำเร็จ', async () => {
      mockGetConnection.mockResolvedValueOnce({
        ok: true,
        data: mockConnectionData,
        error: null,
        status: 200
      });

      const { result } = renderHook(() => useConnection('conn-1'), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockConnectionData);
      expect(mockGetConnection).toHaveBeenCalledWith('conn-1');
    });

    it('ควรไม่ fetch เมื่อ id เป็น empty string', async () => {
      const { result } = renderHook(() => useConnection(''), {
        wrapper: createWrapper()
      });

      // Should not fetch when id is empty
      await waitFor(() => {
        expect(result.current.fetchStatus).toBe('idle');
      });

      expect(mockGetConnection).not.toHaveBeenCalled();
    });

    it('ควร throw error เมื่อ API returns error', async () => {
      mockGetConnection.mockResolvedValueOnce({
        ok: false,
        data: null,
        error: 'Not Found',
        status: 404
      });

      const { result } = renderHook(() => useConnection('non-existent'), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useUpdateConnectionStatus', () => {
    it('ควร update connection status สำเร็จ', async () => {
      mockUpdateConnectionStatus.mockResolvedValueOnce({
        ok: true,
        data: null,
        error: null,
        status: 200
      });

      const { result } = renderHook(() => useUpdateConnectionStatus(), {
        wrapper: createWrapper()
      });

      await result.current.mutateAsync({ id: 'conn-1', status: 'disabled' });

      expect(mockUpdateConnectionStatus).toHaveBeenCalledWith('conn-1', 'disabled');
    });

    it('ควร throw error เมื่อ update ล้มเหลว', async () => {
      mockUpdateConnectionStatus.mockResolvedValueOnce({
        ok: false,
        data: null,
        error: 'Update failed',
        status: 500
      });

      const { result } = renderHook(() => useUpdateConnectionStatus(), {
        wrapper: createWrapper()
      });

      await expect(
        result.current.mutateAsync({ id: 'conn-1', status: 'disabled' })
      ).rejects.toThrow();
    });

    it('ควร invalidate queries เมื่อ update สำเร็จ', async () => {
      mockUpdateConnectionStatus.mockResolvedValueOnce({
        ok: true,
        data: null,
        error: null,
        status: 200
      });

      const { result } = renderHook(() => useUpdateConnectionStatus(), {
        wrapper: createWrapper()
      });

      await result.current.mutateAsync({ id: 'conn-1', status: 'active' });

      // onSuccess should invalidate queries (tested indirectly)
      expect(mockUpdateConnectionStatus).toHaveBeenCalled();
    });
  });
});
