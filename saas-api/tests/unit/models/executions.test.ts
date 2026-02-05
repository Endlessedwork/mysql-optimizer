/**
 * Unit Tests: Executions Model
 * ทดสอบ operations สำหรับ executions
 */

import { Database } from '../../../src/database';
import {
  getExecutions,
  getExecutionById,
  Execution
} from '../../../src/models/executions.model';

const mockQuery = Database.query as jest.Mock;

describe('Executions Model', () => {
  describe('getExecutions', () => {
    it('ควรดึง executions ทั้งหมดสำเร็จ', async () => {
      // Arrange
      const mockRows = [
        {
          id: 'exec-1',
          connectionId: 'conn-1',
          status: 'success',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
          before_metrics: null,
          after_metrics: null
        },
        {
          id: 'exec-2',
          connectionId: 'conn-1',
          status: 'failed',
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-04'),
          before_metrics: { cpu_usage: 50, memory: 1000, disk_latency: 10 },
          after_metrics: { cpu_usage: 30, memory: 800, disk_latency: 5 }
        }
      ];
      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      // Act
      const result = await getExecutions({});

      // Assert
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('completed'); // mapped from 'success'
      expect(result[1].status).toBe('failed');
    });

    it('ควร filter ตาม connectionId', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await getExecutions({ connectionId: 'conn-1' });

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('a.recommendation_pack_id = $1'),
        ['conn-1']
      );
    });

    it('ควร filter ตาม status', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await getExecutions({ status: 'completed' });

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('eh.execution_status = $1'),
        ['completed']
      );
    });

    it('ควร filter ตาม connectionId และ status พร้อมกัน', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await getExecutions({ connectionId: 'conn-1', status: 'completed' });

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND'),
        ['conn-1', 'completed']
      );
    });

    it('ควร return array ว่างเมื่อไม่มี executions', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await getExecutions({});

      // Assert
      expect(result).toEqual([]);
    });

    it('ควรเรียงตาม created_at DESC', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await getExecutions({});

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY eh.created_at DESC'),
        expect.any(Array)
      );
    });

    it('ควร parse metrics จาก JSON', async () => {
      // Arrange
      const mockRows = [{
        id: 'exec-1',
        connectionId: 'conn-1',
        status: 'success',
        createdAt: new Date(),
        updatedAt: new Date(),
        before_metrics: { cpu_usage: 50, memory: 1000, disk_latency: 10 },
        after_metrics: { cpu_usage: 30, memory: 800, disk_latency: 5 }
      }];
      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      // Act
      const result = await getExecutions({});

      // Assert
      expect(result[0].metrics).toBeDefined();
      expect(result[0].metrics?.before.cpu).toBe(50);
      expect(result[0].metrics?.after.cpu).toBe(30);
    });

    it('ควร handle metrics เป็น string (JSON string)', async () => {
      // Arrange
      const mockRows = [{
        id: 'exec-1',
        connectionId: 'conn-1',
        status: 'success',
        createdAt: new Date(),
        updatedAt: new Date(),
        before_metrics: JSON.stringify({ cpu_usage: 50, memory: 1000, disk_latency: 10 }),
        after_metrics: JSON.stringify({ cpu_usage: 30, memory: 800, disk_latency: 5 })
      }];
      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      // Act
      const result = await getExecutions({});

      // Assert
      expect(result[0].metrics?.before.cpu).toBe(50);
    });

    it('ควร handle null metrics', async () => {
      // Arrange
      const mockRows = [{
        id: 'exec-1',
        connectionId: 'conn-1',
        status: 'success',
        createdAt: new Date(),
        updatedAt: new Date(),
        before_metrics: null,
        after_metrics: null
      }];
      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      // Act
      const result = await getExecutions({});

      // Assert
      expect(result[0].metrics).toBeUndefined();
    });

    it('ควร throw error เมื่อ query ล้มเหลว', async () => {
      // Arrange
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      // Act & Assert
      await expect(getExecutions({})).rejects.toThrow('Database error');
    });
  });

  describe('getExecutionById', () => {
    it('ควรดึง execution ตาม id สำเร็จ', async () => {
      // Arrange
      const mockRows = [{
        id: 'exec-1',
        connectionId: 'conn-1',
        status: 'success',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        error_message: null,
        before_metrics: { cpu_usage: 50, memory: 1000, disk_latency: 10 },
        after_metrics: { cpu_usage: 30, memory: 800, disk_latency: 5 }
      }];
      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      // Act
      const result = await getExecutionById('exec-1');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('exec-1');
      expect(result?.status).toBe('completed');
    });

    it('ควร return null เมื่อไม่พบ execution', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await getExecutionById('non-existent');

      // Assert
      expect(result).toBeNull();
    });

    it('ควร map status จาก database status', async () => {
      const testCases = [
        { dbStatus: 'success', expectedStatus: 'completed' },
        { dbStatus: 'failed', expectedStatus: 'failed' },
        { dbStatus: 'pending', expectedStatus: 'pending' },
        { dbStatus: 'running', expectedStatus: 'running' },
        { dbStatus: 'cancelled', expectedStatus: 'cancelled' }
      ];

      for (const { dbStatus, expectedStatus } of testCases) {
        // Arrange
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'exec-1',
            connectionId: 'conn-1',
            status: dbStatus,
            createdAt: new Date(),
            updatedAt: new Date()
          }]
        });

        // Act
        const result = await getExecutionById('exec-1');

        // Assert
        expect(result?.status).toBe(expectedStatus);
      }
    });

    it('ควร include metrics และ verification เมื่อมีข้อมูล', async () => {
      // Arrange
      const mockRows = [{
        id: 'exec-1',
        connectionId: 'conn-1',
        status: 'success',
        createdAt: new Date(),
        updatedAt: new Date(),
        before_metrics: { cpu_usage: 50, memory: 1000, disk_latency: 10 },
        after_metrics: { cpu_usage: 30, memory: 800, disk_latency: 5 }
      }];
      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      // Act
      const result = await getExecutionById('exec-1');

      // Assert
      expect(result?.metrics).toBeDefined();
      expect(result?.verification).toBeDefined();
      expect(result?.verification?.passed).toBe(true);
    });

    it('ควร throw error เมื่อ query ล้มเหลว', async () => {
      // Arrange
      mockQuery.mockRejectedValueOnce(new Error('Query failed'));

      // Act & Assert
      await expect(getExecutionById('exec-1')).rejects.toThrow('Query failed');
    });
  });

  describe('Status Mapping', () => {
    it('ควร map unknown status เป็น pending', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'exec-1',
          connectionId: 'conn-1',
          status: 'unknown-status',
          createdAt: new Date(),
          updatedAt: new Date()
        }]
      });

      // Act
      const result = await getExecutionById('exec-1');

      // Assert
      expect(result?.status).toBe('pending');
    });
  });
});
