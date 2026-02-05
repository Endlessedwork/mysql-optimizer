/**
 * Unit Tests: Recommendations Model
 * ทดสอบ CRUD และ workflow operations สำหรับ recommendations
 */

import { Database } from '../../../src/database';
import {
  getRecommendations,
  getRecommendationById,
  approveRecommendation,
  scheduleRecommendation,
  rejectRecommendation,
  Recommendation
} from '../../../src/models/recommendations.model';

const mockQuery = Database.query as jest.Mock;

describe('Recommendations Model', () => {
  describe('getRecommendations', () => {
    it('ควรดึง recommendations ทั้งหมดสำเร็จ', async () => {
      // Arrange
      const mockRows = [
        {
          id: 'rec-1',
          connectionId: 'conn-1',
          status: 'pending',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
          scheduledAt: null,
          reason: null
        },
        {
          id: 'rec-2',
          connectionId: 'conn-1',
          status: 'approved',
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-04'),
          scheduledAt: new Date('2024-01-05'),
          reason: null
        }
      ];
      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      // Act
      const result = await getRecommendations({});

      // Assert
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('pending');
      expect(result[1].status).toBe('approved');
    });

    it('ควร filter ตาม connectionId', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await getRecommendations({ connectionId: 'conn-1' });

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('rp.scan_run_id = $1'),
        ['conn-1']
      );
    });

    it('ควร filter ตาม status', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await getRecommendations({ status: 'pending' });

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("COALESCE(a.status, 'pending') = $1"),
        ['pending']
      );
    });

    it('ควร filter ตาม connectionId และ status พร้อมกัน', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await getRecommendations({ connectionId: 'conn-1', status: 'approved' });

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND'),
        ['conn-1', 'approved']
      );
    });

    it('ควร return array ว่างเมื่อไม่มี recommendations', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await getRecommendations({});

      // Assert
      expect(result).toEqual([]);
    });

    it('ควรเรียงตาม created_at DESC', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await getRecommendations({});

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY rp.created_at DESC'),
        expect.any(Array)
      );
    });

    it('ควร throw error เมื่อ query ล้มเหลว', async () => {
      // Arrange
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      // Act & Assert
      await expect(getRecommendations({})).rejects.toThrow('Database error');
    });
  });

  describe('getRecommendationById', () => {
    it('ควรดึง recommendation ตาม id สำเร็จ', async () => {
      // Arrange
      const mockRows = [{
        id: 'rec-1',
        connectionId: 'conn-1',
        status: 'pending',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        scheduledAt: null,
        reason: null
      }];
      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      // Act
      const result = await getRecommendationById('rec-1');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('rec-1');
      expect(result?.status).toBe('pending');
    });

    it('ควร return null เมื่อไม่พบ recommendation', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await getRecommendationById('non-existent');

      // Assert
      expect(result).toBeNull();
    });

    it('ควร handle null status และใช้ pending เป็น default', async () => {
      // Arrange
      const mockRows = [{
        id: 'rec-1',
        connectionId: 'conn-1',
        status: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        scheduledAt: null,
        reason: null
      }];
      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      // Act
      const result = await getRecommendationById('rec-1');

      // Assert
      expect(result?.status).toBe('pending');
    });
  });

  describe('approveRecommendation', () => {
    it('ควร approve recommendation ที่เป็น pending สำเร็จ', async () => {
      // Arrange - mock getRecommendationById
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'rec-1',
          connectionId: 'conn-1',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        }]
      });
      // mock INSERT approval
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'approval-1' }] });
      // mock getRecommendationById หลัง approve
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'rec-1',
          connectionId: 'conn-1',
          status: 'approved',
          createdAt: new Date(),
          updatedAt: new Date()
        }]
      });

      // Act
      const result = await approveRecommendation('rec-1');

      // Assert
      expect(result?.status).toBe('approved');
    });

    it('ควร return null เมื่อ recommendation ไม่ใช่ pending', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'rec-1',
          connectionId: 'conn-1',
          status: 'approved', // ไม่ใช่ pending
          createdAt: new Date(),
          updatedAt: new Date()
        }]
      });

      // Act
      const result = await approveRecommendation('rec-1');

      // Assert
      expect(result).toBeNull();
    });

    it('ควร return null เมื่อไม่พบ recommendation', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await approveRecommendation('non-existent');

      // Assert
      expect(result).toBeNull();
    });

    it('ควรใช้ ON CONFLICT สำหรับ upsert approval', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'rec-1', connectionId: 'c', status: 'pending', createdAt: new Date(), updatedAt: new Date() }]
      });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'approval-1' }] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'rec-1', connectionId: 'c', status: 'approved', createdAt: new Date(), updatedAt: new Date() }]
      });

      // Act
      await approveRecommendation('rec-1');

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        ['rec-1']
      );
    });
  });

  describe('scheduleRecommendation', () => {
    it('ควร schedule recommendation ที่เป็น approved สำเร็จ', async () => {
      // Arrange
      const scheduledAt = '2024-02-01T10:00:00.000Z';
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'rec-1',
          connectionId: 'conn-1',
          status: 'approved',
          createdAt: new Date(),
          updatedAt: new Date()
        }]
      });
      mockQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'rec-1',
          connectionId: 'conn-1',
          status: 'scheduled',
          createdAt: new Date(),
          updatedAt: new Date(),
          scheduledAt: new Date(scheduledAt)
        }]
      });

      // Act
      const result = await scheduleRecommendation('rec-1', scheduledAt);

      // Assert
      expect(result?.status).toBe('scheduled');
    });

    it('ควร return null เมื่อ recommendation ไม่ใช่ approved', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'rec-1',
          connectionId: 'conn-1',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        }]
      });

      // Act
      const result = await scheduleRecommendation('rec-1', '2024-02-01T10:00:00.000Z');

      // Assert
      expect(result).toBeNull();
    });

    it('ควร return null เมื่อไม่พบ recommendation', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await scheduleRecommendation('non-existent', '2024-02-01');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('rejectRecommendation', () => {
    it('ควร reject recommendation พร้อม reason', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'rec-1', connectionId: 'c', status: 'pending', createdAt: new Date(), updatedAt: new Date() }]
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'rec-1',
          connectionId: 'c',
          status: 'rejected',
          createdAt: new Date(),
          updatedAt: new Date(),
          reason: 'Not needed anymore'
        }]
      });

      // Act
      const result = await rejectRecommendation('rec-1', 'Not needed anymore');

      // Assert
      expect(result?.status).toBe('rejected');
      expect(result?.reason).toBe('Not needed anymore');
    });

    it('ควร reject recommendation โดยไม่มี reason', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'rec-1', connectionId: 'c', status: 'pending', createdAt: new Date(), updatedAt: new Date() }]
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'rec-1', connectionId: 'c', status: 'rejected', createdAt: new Date(), updatedAt: new Date() }]
      });

      // Act
      const result = await rejectRecommendation('rec-1');

      // Assert
      expect(result?.status).toBe('rejected');
    });

    it('ควร return null เมื่อไม่พบ recommendation', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await rejectRecommendation('non-existent', 'reason');

      // Assert
      expect(result).toBeNull();
    });
  });
});
