/**
 * Jest Test Setup
 * ตั้งค่า environment และ mock สำหรับ tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.API_SECRET = 'test-api-secret';
process.env.TENANT_ID = 'test-tenant-id';
process.env.DATABASE_URL = 'postgres://localhost:5432/test_db';

// Mock Database module
jest.mock('../src/database', () => ({
  Database: {
    query: jest.fn(),
    getClient: jest.fn(),
    getInstance: jest.fn()
  },
  connectDB: jest.fn(),
  closeDB: jest.fn(),
  query: jest.fn(),
  getPool: jest.fn()
}));

// Global test utilities
beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  // Cleanup after all tests
});

// Custom matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid UUID`
          : `expected ${received} to be a valid UUID`,
      pass
    };
  }
});

// Extend Jest types for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
    }
  }
}

export {};
