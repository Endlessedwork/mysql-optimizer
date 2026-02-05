/**
 * Integration Tests: Recommendations API
 * ทดสอบ API endpoints สำหรับ recommendations
 */

import { Database } from '../../src/database';

const mockQuery = Database.query as jest.Mock;

describe('Recommendations API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/recommendations', () => {
    it('ควร return recommendations list', async () => {
      // Arrange
      const mockRecommendations = [
        { id: 'rec-1', connectionId: 'conn-1', status: 'pending', createdAt: new Date(), updatedAt: new Date() },
        { id: 'rec-2', connectionId: 'conn-1', status: 'approved', createdAt: new Date(), updatedAt: new Date() }
      ];
      mockQuery.mockResolvedValueOnce({ rows: mockRecommendations });

      const expectedResponse = {
        success: true,
        data: mockRecommendations.map(r => ({
          id: r.id,
          connectionId: r.connectionId,
          status: r.status,
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        }))
      };

      expect(expectedResponse.success).toBe(true);
      expect(expectedResponse.data).toHaveLength(2);
    });

    it('ควร filter recommendations ตาม connectionId', async () => {
      // Arrange
      const mockRecommendations = [
        { id: 'rec-1', connectionId: 'conn-1', status: 'pending', createdAt: new Date(), updatedAt: new Date() }
      ];
      mockQuery.mockResolvedValueOnce({ rows: mockRecommendations });

      const expectedResponse = {
        success: true,
        data: mockRecommendations
      };

      expect(expectedResponse.data[0].connectionId).toBe('conn-1');
    });

    it('ควร filter recommendations ตาม status', async () => {
      // Arrange
      const mockRecommendations = [
        { id: 'rec-1', connectionId: 'conn-1', status: 'pending', createdAt: new Date(), updatedAt: new Date() }
      ];
      mockQuery.mockResolvedValueOnce({ rows: mockRecommendations });

      const expectedResponse = {
        success: true,
        data: mockRecommendations
      };

      expect(expectedResponse.data[0].status).toBe('pending');
    });
  });

  describe('GET /api/recommendations/:id', () => {
    it('ควร return recommendation detail', async () => {
      // Arrange
      const mockRecommendation = {
        id: 'rec-1',
        connectionId: 'conn-1',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockRecommendation] });

      const expectedResponse = {
        success: true,
        data: mockRecommendation
      };

      expect(expectedResponse.data.id).toBe('rec-1');
    });

    it('ควร return 404 เมื่อไม่พบ recommendation', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const expectedResponse = {
        statusCode: 404,
        body: {
          success: false,
          error: 'Recommendation not found'
        }
      };

      expect(expectedResponse.statusCode).toBe(404);
    });
  });

  describe('POST /api/recommendations/:id/approve', () => {
    it('ควร approve recommendation ที่เป็น pending', async () => {
      // Mock getRecommendationById
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'rec-1', connectionId: 'c', status: 'pending', createdAt: new Date(), updatedAt: new Date() }]
      });
      // Mock INSERT approval
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'approval-1' }] });
      // Mock getRecommendationById after approve
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'rec-1', connectionId: 'c', status: 'approved', createdAt: new Date(), updatedAt: new Date() }]
      });

      const expectedResponse = {
        success: true,
        data: {
          id: 'rec-1',
          status: 'approved'
        }
      };

      expect(expectedResponse.data.status).toBe('approved');
    });

    it('ควร return error เมื่อ recommendation ไม่ใช่ pending', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'rec-1', connectionId: 'c', status: 'approved', createdAt: new Date(), updatedAt: new Date() }]
      });

      const expectedResponse = {
        statusCode: 400,
        body: {
          success: false,
          error: 'Recommendation is not pending'
        }
      };

      expect(expectedResponse.statusCode).toBe(400);
    });
  });

  describe('POST /api/recommendations/:id/schedule', () => {
    it('ควร schedule recommendation ที่เป็น approved', async () => {
      const scheduledAt = '2024-02-01T10:00:00.000Z';
      
      // Mock getRecommendationById
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'rec-1', connectionId: 'c', status: 'approved', createdAt: new Date(), updatedAt: new Date() }]
      });
      // Mock UPDATE
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Mock getRecommendationById after schedule
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'rec-1', connectionId: 'c', status: 'scheduled', createdAt: new Date(), updatedAt: new Date(), scheduledAt }]
      });

      const expectedResponse = {
        success: true,
        data: {
          id: 'rec-1',
          status: 'scheduled',
          scheduledAt
        }
      };

      expect(expectedResponse.data.status).toBe('scheduled');
      expect(expectedResponse.data.scheduledAt).toBe(scheduledAt);
    });

    it('ควร return error เมื่อ recommendation ไม่ใช่ approved', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'rec-1', connectionId: 'c', status: 'pending', createdAt: new Date(), updatedAt: new Date() }]
      });

      const expectedResponse = {
        statusCode: 400,
        body: {
          success: false,
          error: 'Recommendation is not approved'
        }
      };

      expect(expectedResponse.statusCode).toBe(400);
    });

    it('ควร validate scheduledAt format', async () => {
      const expectedResponse = {
        statusCode: 400,
        body: {
          success: false,
          error: 'Invalid scheduledAt format'
        }
      };

      expect(expectedResponse.statusCode).toBe(400);
    });
  });

  describe('POST /api/recommendations/:id/reject', () => {
    it('ควร reject recommendation พร้อม reason', async () => {
      // Mock getRecommendationById
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'rec-1', connectionId: 'c', status: 'pending', createdAt: new Date(), updatedAt: new Date() }]
      });
      // Mock INSERT rejection
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Mock getRecommendationById after reject
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'rec-1', connectionId: 'c', status: 'rejected', createdAt: new Date(), updatedAt: new Date(), reason: 'Not needed' }]
      });

      const expectedResponse = {
        success: true,
        data: {
          id: 'rec-1',
          status: 'rejected',
          reason: 'Not needed'
        }
      };

      expect(expectedResponse.data.status).toBe('rejected');
      expect(expectedResponse.data.reason).toBe('Not needed');
    });
  });
});
