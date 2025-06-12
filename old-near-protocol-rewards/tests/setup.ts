import dotenv from "dotenv";

// Load environment variables from .env.test
dotenv.config({ path: ".env.test" });

// Set default timeout for all tests
jest.setTimeout(30000);

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  // Keep error logging
  error: console.error,
  // Silence info and warn in tests
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};
