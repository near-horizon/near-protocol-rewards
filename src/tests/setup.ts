import '@testing-library/jest-dom';
import dotenv from 'dotenv';
import { Pool, TextEncoder, TextDecoder } from 'pg';

dotenv.config({ path: '.env.test' });

// Add TextEncoder/TextDecoder to global scope
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock PostgreSQL
jest.mock('pg', () => {
  const mPool = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

// Mock Axios
jest.mock('axios');

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test setup
beforeAll(async () => {
  // Setup test database if needed
});

// Global test teardown
afterAll(async () => {
  // Cleanup test resources
});
