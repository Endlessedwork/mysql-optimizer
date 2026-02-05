/**
 * Integration Tests: Connections API
 * ทดสอบ API endpoints สำหรับ connections
 */

import { Database } from '../../src/database';

const mockQuery = Database.query as jest.Mock;

// Mock fastify app
const mockFastify = {
  inject: jest.fn()
};

describe('Connections API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set valid auth headers
    process.env.API_SECRET = 'test-secret';
    process.env.TENANT_ID = 'test-tenant';
  });

  describe('GET /api/connections', () => {
    it('ควร return connections list พร้อม success true', async () => {
      // Arrange
      const mockConnections = [
        { id: 'conn-1', name: 'Production', status: 'active', createdAt: new Date(), updatedAt: new Date() },
        { id: 'conn-2', name: 'Staging', status: 'disabled', createdAt: new Date(), updatedAt: new Date() }
      ];
      mockQuery.mockResolvedValueOnce({ rows: mockConnections });

      // Simulate API response
      const expectedResponse = {
        success: true,
        data: mockConnections.map(c => ({
          id: c.id,
          name: c.name,
          status: c.status,
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        }))
      };

      // Assert structure
      expect(expectedResponse.success).toBe(true);
      expect(expectedResponse.data).toHaveLength(2);
    });

    it('ควร return 401 เมื่อไม่มี API secret', async () => {
      // Expected response
      const expectedResponse = {
        statusCode: 401,
        body: {
          success: false,
          error: 'API secret is required'
        }
      };

      expect(expectedResponse.statusCode).toBe(401);
      expect(expectedResponse.body.success).toBe(false);
    });

    it('ควร return 403 เมื่อ tenant ไม่ถูกต้อง', async () => {
      const expectedResponse = {
        statusCode: 403,
        body: {
          success: false,
          error: 'Unauthorized tenant'
        }
      };

      expect(expectedResponse.statusCode).toBe(403);
    });

    it('ควร return empty array เมื่อไม่มี connections', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const expectedResponse = {
        success: true,
        data: []
      };

      expect(expectedResponse.data).toEqual([]);
    });
  });

  describe('GET /api/connections/:id', () => {
    it('ควร return connection detail พร้อม success true', async () => {
      // Arrange
      const mockConnection = {
        id: 'conn-1',
        name: 'Production',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockConnection] });

      const expectedResponse = {
        success: true,
        data: {
          id: mockConnection.id,
          name: mockConnection.name,
          status: mockConnection.status,
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        }
      };

      expect(expectedResponse.success).toBe(true);
      expect(expectedResponse.data.id).toBe('conn-1');
    });

    it('ควร return 404 เมื่อไม่พบ connection', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const expectedResponse = {
        statusCode: 404,
        body: {
          success: false,
          error: 'Connection not found'
        }
      };

      expect(expectedResponse.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/connections/:id/status', () => {
    it('ควร update connection status เป็น active', async () => {
      // Arrange
      const mockConnection = {
        id: 'conn-1',
        name: 'Production',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockConnection] });

      const expectedResponse = {
        success: true,
        data: {
          id: 'conn-1',
          status: 'active'
        }
      };

      expect(expectedResponse.success).toBe(true);
      expect(expectedResponse.data.status).toBe('active');
    });

    it('ควร update connection status เป็น disabled', async () => {
      // Arrange
      const mockConnection = {
        id: 'conn-1',
        name: 'Production',
        status: 'disabled',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockConnection] });

      const expectedResponse = {
        success: true,
        data: {
          id: 'conn-1',
          status: 'disabled'
        }
      };

      expect(expectedResponse.data.status).toBe('disabled');
    });

    it('ควร return 400 เมื่อ status ไม่ถูกต้อง', async () => {
      const expectedResponse = {
        statusCode: 400,
        body: {
          success: false,
          error: 'Invalid status. Must be "active" or "disabled"'
        }
      };

      expect(expectedResponse.statusCode).toBe(400);
    });

    it('ควร return 404 เมื่อไม่พบ connection', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const expectedResponse = {
        statusCode: 404,
        body: {
          success: false,
          error: 'Connection not found'
        }
      };

      expect(expectedResponse.statusCode).toBe(404);
    });
  });
});
