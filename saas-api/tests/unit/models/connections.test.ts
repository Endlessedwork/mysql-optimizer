/**
 * Unit Tests: Connections Model
 * ทดสอบ CRUD operations สำหรับ connections
 */

import { Database } from '../../../src/database';
import {
  getConnections,
  getConnectionById,
  updateConnectionStatus,
  Connection
} from '../../../src/models/connections.model';

// Mock Database
const mockQuery = Database.query as jest.Mock;

describe('Connections Model', () => {
  describe('getConnections', () => {
    it('ควรดึง connections ทั้งหมดสำเร็จ', async () => {
      // Arrange
      const mockRows = [
        {
          id: 'conn-1',
          name: 'Production DB',
          status: 'active',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02')
        },
        {
          id: 'conn-2',
          name: 'Staging DB',
          status: 'disabled',
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-04')
        }
      ];
      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      // Act
      const result = await getConnections();

      // Assert
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('conn-1');
      expect(result[0].name).toBe('Production DB');
      expect(result[0].status).toBe('active');
      expect(result[1].status).toBe('disabled');
    });

    it('ควร return array ว่างเมื่อไม่มี connections', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await getConnections();

      // Assert
      expect(result).toEqual([]);
    });

    it('ควร handle date conversion properly', async () => {
      // Arrange
      const mockRows = [{
        id: 'conn-1',
        name: 'Test DB',
        status: 'active',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-02T12:00:00Z')
      }];
      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      // Act
      const result = await getConnections();

      // Assert
      expect(result[0].createdAt).toBe('2024-01-01T10:00:00.000Z');
      expect(result[0].updatedAt).toBe('2024-01-02T12:00:00.000Z');
    });

    it('ควร throw error เมื่อ database query ล้มเหลว', async () => {
      // Arrange
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      // Act & Assert
      await expect(getConnections()).rejects.toThrow('Database connection failed');
    });
  });

  describe('getConnectionById', () => {
    it('ควรดึง connection ตาม id สำเร็จ', async () => {
      // Arrange
      const mockRows = [{
        id: 'conn-1',
        name: 'Production DB',
        status: 'active',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02')
      }];
      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      // Act
      const result = await getConnectionById('conn-1');

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        ['conn-1']
      );
      expect(result).not.toBeNull();
      expect(result?.id).toBe('conn-1');
      expect(result?.name).toBe('Production DB');
    });

    it('ควร return null เมื่อไม่พบ connection', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await getConnectionById('non-existent');

      // Assert
      expect(result).toBeNull();
    });

    it('ควร validate id parameter ใน query', async () => {
      // Arrange
      const testId = 'test-uuid-123';
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await getConnectionById(testId);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [testId]
      );
    });

    it('ควร throw error เมื่อ query ล้มเหลว', async () => {
      // Arrange
      mockQuery.mockRejectedValueOnce(new Error('Query failed'));

      // Act & Assert
      await expect(getConnectionById('conn-1')).rejects.toThrow('Query failed');
    });
  });

  describe('updateConnectionStatus', () => {
    it('ควร update status เป็น active สำเร็จ', async () => {
      // Arrange
      const mockRows = [{
        id: 'conn-1',
        name: 'Test DB',
        status: 'active',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02')
      }];
      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      // Act
      const result = await updateConnectionStatus('conn-1', 'active');

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE connection_profiles'),
        [true, 'conn-1']
      );
      expect(result?.status).toBe('active');
    });

    it('ควร update status เป็น disabled สำเร็จ', async () => {
      // Arrange
      const mockRows = [{
        id: 'conn-1',
        name: 'Test DB',
        status: 'disabled',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02')
      }];
      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      // Act
      const result = await updateConnectionStatus('conn-1', 'disabled');

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [false, 'conn-1']
      );
      expect(result?.status).toBe('disabled');
    });

    it('ควร return null เมื่อไม่พบ connection', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await updateConnectionStatus('non-existent', 'active');

      // Assert
      expect(result).toBeNull();
    });

    it('ควรใช้ RETURNING clause เพื่อดึงข้อมูลที่ update แล้ว', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [{ 
        id: 'conn-1', 
        name: 'Test', 
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }] });

      // Act
      await updateConnectionStatus('conn-1', 'active');

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('RETURNING'),
        expect.any(Array)
      );
    });

    it('ควร throw error เมื่อ update ล้มเหลว', async () => {
      // Arrange
      mockQuery.mockRejectedValueOnce(new Error('Update failed'));

      // Act & Assert
      await expect(updateConnectionStatus('conn-1', 'active')).rejects.toThrow('Update failed');
    });
  });
});
