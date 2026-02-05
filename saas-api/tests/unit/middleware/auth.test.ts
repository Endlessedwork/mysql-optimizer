/**
 * Unit Tests: Authentication Middleware
 * ทดสอบ API Secret และ Tenant validation
 */

// Mock environment before importing
const originalEnv = process.env;

beforeAll(() => {
  process.env = {
    ...originalEnv,
    API_SECRET: 'test-api-secret',
    TENANT_ID: 'test-tenant-id'
  };
});

afterAll(() => {
  process.env = originalEnv;
});

// Mock tenant-utils
jest.mock('../../../src/utils/tenant-utils', () => ({
  getTenantIdFromRequest: jest.fn()
}));

import { authenticate } from '../../../src/middleware/auth';
import { getTenantIdFromRequest } from '../../../src/utils/tenant-utils';
import { FastifyRequest, FastifyReply } from 'fastify';

const mockGetTenantId = getTenantIdFromRequest as jest.Mock;

describe('Auth Middleware', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let statusMock: jest.Mock;
  let sendMock: jest.Mock;

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    sendMock = jest.fn().mockResolvedValue(undefined);
    
    mockRequest = {
      headers: {}
    };
    
    mockReply = {
      status: statusMock,
      send: sendMock,
      sent: false
    };
  });

  describe('API Secret Validation', () => {
    it('ควร reject request ที่ไม่มี API secret', async () => {
      // Arrange
      mockRequest.headers = {};

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(sendMock).toHaveBeenCalledWith({
        success: false,
        error: 'API secret is required'
      });
    });

    it('ควร reject request ที่มี API secret ไม่ถูกต้อง', async () => {
      // Arrange
      mockRequest.headers = {
        'x-api-secret': 'wrong-secret'
      };

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(sendMock).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid API secret'
      });
    });

    it('ควร pass request ที่มี API secret ถูกต้อง', async () => {
      // Arrange
      mockRequest.headers = {
        'x-api-secret': 'test-api-secret'
      };
      mockGetTenantId.mockReturnValue('test-tenant-id');

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert - should not send 401
      expect(statusMock).not.toHaveBeenCalledWith(401);
    });
  });

  describe('Tenant Validation', () => {
    beforeEach(() => {
      mockRequest.headers = {
        'x-api-secret': 'test-api-secret'
      };
    });

    it('ควร reject request ที่ไม่มี tenant ID', async () => {
      // Arrange
      mockGetTenantId.mockReturnValue(null);

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(sendMock).toHaveBeenCalledWith({
        success: false,
        error: 'Tenant ID is required'
      });
    });

    it('ควร reject request ที่มี tenant ID ไม่ถูกต้อง', async () => {
      // Arrange
      mockGetTenantId.mockReturnValue('wrong-tenant-id');

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(sendMock).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized tenant'
      });
    });

    it('ควร pass request ที่มี tenant ID ถูกต้อง', async () => {
      // Arrange
      mockGetTenantId.mockReturnValue('test-tenant-id');

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert - should not send any error
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('Combined Validation', () => {
    it('ควรตรวจสอบ API secret ก่อน tenant', async () => {
      // Arrange - ไม่มี API secret
      mockRequest.headers = {};
      mockGetTenantId.mockReturnValue('test-tenant-id');

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert - ควรได้ 401 ไม่ใช่ 400 หรือ 403
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(sendMock).toHaveBeenCalledWith({
        success: false,
        error: 'API secret is required'
      });
    });

    it('ควรหยุดการ validate ถ้า reply ถูกส่งแล้ว', async () => {
      // Arrange
      mockRequest.headers = {};
      
      // Simulate that reply was already sent
      let sentFlag = false;
      const mockStatusThatSetsSent = jest.fn().mockImplementation(() => {
        sentFlag = true;
        return mockReply;
      });
      
      mockReply = {
        status: mockStatusThatSetsSent,
        send: sendMock,
        get sent() { return sentFlag; }
      };

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert - validateTenant should not be called
      expect(mockGetTenantId).not.toHaveBeenCalled();
    });

    it('ควร pass ทั้ง API secret และ tenant validation', async () => {
      // Arrange
      mockRequest.headers = {
        'x-api-secret': 'test-api-secret'
      };
      mockGetTenantId.mockReturnValue('test-tenant-id');

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(statusMock).not.toHaveBeenCalled();
      expect(sendMock).not.toHaveBeenCalled();
    });
  });

  describe('Header Case Sensitivity', () => {
    it('ควร handle x-api-secret header (lowercase)', async () => {
      // Arrange
      mockRequest.headers = {
        'x-api-secret': 'test-api-secret'
      };
      mockGetTenantId.mockReturnValue('test-tenant-id');

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('Error Messages', () => {
    it('ควร return success: false ใน response', async () => {
      // Arrange
      mockRequest.headers = {};

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });

    it('ควร return error message ที่ชัดเจน', async () => {
      // Arrange
      mockRequest.headers = {
        'x-api-secret': 'wrong'
      };

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });
  });
});
