/**
 * Unit Tests: Kill Switch Model
 * ทดสอบ kill switch operations สำหรับ global และ per-connection
 */

import { Database } from '../../../src/database';
import {
  getKillSwitchStatus,
  getGlobalKillSwitchStatus,
  getConnectionKillSwitchStatuses,
  toggleKillSwitch,
  toggleGlobalKillSwitch,
  KillSwitchStatus
} from '../../../src/models/kill-switch.model';

const mockQuery = Database.query as jest.Mock;

describe('Kill Switch Model', () => {
  describe('getKillSwitchStatus', () => {
    it('ควรดึง kill switch status ทั้ง global และ connections', async () => {
      // Arrange
      // Query สำหรับ global
      mockQuery.mockResolvedValueOnce({
        rows: [{ is_active: true }]
      });
      // Query สำหรับ connections
      mockQuery.mockResolvedValueOnce({
        rows: [
          { connectionId: 'conn-1', enabled: true },
          { connectionId: 'conn-2', enabled: false }
        ]
      });

      // Act
      const result = await getKillSwitchStatus();

      // Assert
      expect(result.global).toBe(true);
      expect(result.connections).toHaveLength(2);
      expect(result.connections[0].connectionId).toBe('conn-1');
      expect(result.connections[0].enabled).toBe(true);
    });

    it('ควร return global: false เมื่อไม่มี global setting', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await getKillSwitchStatus();

      // Assert
      expect(result.global).toBe(false);
      expect(result.connections).toEqual([]);
    });

    it('ควร handle empty connections', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [{ is_active: false }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await getKillSwitchStatus();

      // Assert
      expect(result.global).toBe(false);
      expect(result.connections).toEqual([]);
    });
  });

  describe('getGlobalKillSwitchStatus', () => {
    it('ควร return enabled: true เมื่อ global kill switch เปิดอยู่', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({
        rows: [{ is_active: true }]
      });

      // Act
      const result = await getGlobalKillSwitchStatus();

      // Assert
      expect(result.enabled).toBe(true);
    });

    it('ควร return enabled: false เมื่อ global kill switch ปิดอยู่', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({
        rows: [{ is_active: false }]
      });

      // Act
      const result = await getGlobalKillSwitchStatus();

      // Assert
      expect(result.enabled).toBe(false);
    });

    it('ควร return enabled: false เมื่อไม่มี global setting', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await getGlobalKillSwitchStatus();

      // Assert
      expect(result.enabled).toBe(false);
    });
  });

  describe('getConnectionKillSwitchStatuses', () => {
    it('ควรดึง connection kill switch statuses ทั้งหมด', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({
        rows: [
          { connectionId: 'conn-1', enabled: true },
          { connectionId: 'conn-2', enabled: false }
        ]
      });

      // Act
      const result = await getConnectionKillSwitchStatuses();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].connectionId).toBe('conn-1');
      expect(result[0].enabled).toBe(true);
      expect(result[1].connectionId).toBe('conn-2');
      expect(result[1].enabled).toBe(false);
    });

    it('ควร return array ว่างเมื่อไม่มี connection settings', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await getConnectionKillSwitchStatuses();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('toggleKillSwitch', () => {
    it('ควร enable kill switch สำหรับ connection สำเร็จ', async () => {
      // Arrange - check connection exists
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'conn-1' }]
      });
      // upsert kill switch
      mockQuery.mockResolvedValueOnce({
        rows: [{
          connectionId: 'conn-1',
          enabled: true,
          reason: 'Maintenance',
          updatedAt: new Date()
        }]
      });

      // Act
      const result = await toggleKillSwitch('conn-1', true, 'Maintenance');

      // Assert
      expect(result?.enabled).toBe(true);
      expect(result?.reason).toBe('Maintenance');
    });

    it('ควร disable kill switch สำหรับ connection สำเร็จ', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'conn-1' }] });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          connectionId: 'conn-1',
          enabled: false,
          reason: null,
          updatedAt: new Date()
        }]
      });

      // Act
      const result = await toggleKillSwitch('conn-1', false);

      // Assert
      expect(result?.enabled).toBe(false);
    });

    it('ควร return null เมื่อไม่พบ connection', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await toggleKillSwitch('non-existent', true);

      // Assert
      expect(result).toBeNull();
    });

    it('ควรใช้ ON CONFLICT สำหรับ upsert', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'conn-1' }] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ connectionId: 'conn-1', enabled: true, reason: 'test', updatedAt: new Date() }]
      });

      // Act
      await toggleKillSwitch('conn-1', true, 'test');

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        ['conn-1', true, 'test']
      );
    });

    it('ควร throw error เมื่อ query ล้มเหลว', async () => {
      // Arrange
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      // Act & Assert
      await expect(toggleKillSwitch('conn-1', true)).rejects.toThrow('Database error');
    });
  });

  describe('toggleGlobalKillSwitch', () => {
    it('ควร enable global kill switch สำเร็จ', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({
        rows: [{
          enabled: true,
          reason: 'Emergency maintenance',
          updatedAt: new Date()
        }]
      });

      // Act
      const result = await toggleGlobalKillSwitch(true, 'Emergency maintenance');

      // Assert
      expect(result?.enabled).toBe(true);
      expect(result?.reason).toBe('Emergency maintenance');
    });

    it('ควร disable global kill switch สำเร็จ', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({
        rows: [{
          enabled: false,
          reason: null,
          updatedAt: new Date()
        }]
      });

      // Act
      const result = await toggleGlobalKillSwitch(false);

      // Assert
      expect(result?.enabled).toBe(false);
    });

    it('ควรใช้ tenant_id IS NULL สำหรับ global', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({
        rows: [{ enabled: true, reason: 'test', updatedAt: new Date() }]
      });

      // Act
      await toggleGlobalKillSwitch(true, 'test');

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('tenant_id IS NULL'),
        [true, 'test']
      );
    });

    it('ควร return null เมื่อ update ไม่สำเร็จ', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await toggleGlobalKillSwitch(true, 'test');

      // Assert
      expect(result).toBeNull();
    });

    it('ควร throw error เมื่อ query ล้มเหลว', async () => {
      // Arrange
      mockQuery.mockRejectedValueOnce(new Error('Connection failed'));

      // Act & Assert
      await expect(toggleGlobalKillSwitch(true)).rejects.toThrow('Connection failed');
    });
  });

  describe('Kill Switch Safety', () => {
    it('ควรต้องมี reason เมื่อ enable global kill switch', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({
        rows: [{ enabled: true, reason: 'Required reason', updatedAt: new Date() }]
      });

      // Act
      const result = await toggleGlobalKillSwitch(true, 'Required reason');

      // Assert - should have reason when enabled
      expect(result?.reason).toBeTruthy();
    });

    it('ควร track updatedAt timestamp', async () => {
      // Arrange
      const now = new Date();
      mockQuery.mockResolvedValueOnce({
        rows: [{ enabled: true, reason: 'test', updatedAt: now }]
      });

      // Act
      const result = await toggleGlobalKillSwitch(true, 'test');

      // Assert
      expect(result?.updatedAt).toBeDefined();
    });
  });
});
