/**
 * Jest Test Setup
 * Global configuration for authentication system tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters-long-for-security';
process.env.JWT_ACCESS_TOKEN_EXPIRY = '8h';
process.env.JWT_REFRESH_TOKEN_EXPIRY = '30d';
process.env.BCRYPT_ROUNDS = '10'; // Lower for faster tests
process.env.ACCOUNT_LOCKOUT_ATTEMPTS = '10';
process.env.ACCOUNT_LOCKOUT_DURATION_MINUTES = '30';
process.env.DATABASE_URL = 'postgres://localhost:5432/test_db';

// Global test utilities
beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  // Cleanup after all tests
  jest.restoreAllMocks();
});

// Increase timeout for integration tests
jest.setTimeout(10000);

// Mock console to reduce noise in tests (but allow debugging when needed)
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  error: jest.fn(), // Mock error to reduce noise
  warn: jest.fn(),  // Mock warn to reduce noise
  // Keep log and debug for troubleshooting
};

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
  },

  toBeValidJWT(received: string) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    const pass = typeof received === 'string' && jwtRegex.test(received);
    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid JWT`
          : `expected ${received} to be a valid JWT`,
      pass
    };
  },

  toBeValidBcryptHash(received: string) {
    const bcryptRegex = /^\$2[aby]\$\d{2}\$.{53}$/;
    const pass = typeof received === 'string' && bcryptRegex.test(received);
    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid bcrypt hash`
          : `expected ${received} to be a valid bcrypt hash`,
      pass
    };
  },

  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    return {
      message: () =>
        pass
          ? `expected ${received} not to be within range ${floor} - ${ceiling}`
          : `expected ${received} to be within range ${floor} - ${ceiling}`,
      pass
    };
  }
});

// Extend Jest types for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidJWT(): R;
      toBeValidBcryptHash(): R;
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}

export {};
