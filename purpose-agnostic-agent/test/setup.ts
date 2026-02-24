// Global test setup
// This file runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.GOOGLE_AI_API_KEY = 'test-key';
process.env.OPENAI_API_KEY = 'test-key';
process.env.OPENROUTER_API_KEY = 'test-key';
process.env.API_KEYS = 'test-api-key-1,test-api-key-2';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
};
