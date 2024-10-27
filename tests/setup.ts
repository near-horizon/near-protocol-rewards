/* eslint-disable @typescript-eslint/no-non-null-assertion */

import dotenv from 'dotenv';
import { Pool } from 'pg';
import { Logger } from '../src/utils/logger';
import { PostgresStorage } from '../src/storage/postgres';
import { GitHubMetrics } from '../src/types';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Validate required environment variables
const requiredEnvVars = [
  'POSTGRES_HOST',
  'POSTGRES_PORT',
  'POSTGRES_DB',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'GITHUB_TOKEN',
  'GITHUB_REPO',
  'NEAR_ACCOUNT'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

// Test configuration
export const testConfig = {
  projectId: 'test-project',
  nearAccount: process.env.NEAR_ACCOUNT!,
  githubRepo: process.env.GITHUB_REPO!,
  githubToken: process.env.GITHUB_TOKEN!,
  storage: {
    type: 'postgres' as const,
    config: {
      host: process.env.POSTGRES_HOST!,
      port: parseInt(process.env.POSTGRES_PORT!, 10),
      database: process.env.POSTGRES_DB!,
      user: process.env.POSTGRES_USER!,
      password: process.env.POSTGRES_PASSWORD!
    }
  }
};

// Setup test database
export async function setupTestDb() {
  const logger = new Logger({ projectId: 'test' });
  const storage = new PostgresStorage({
    connectionConfig: testConfig.storage.config,
    logger
  });
  
  try {
    await storage.initialize();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

// Database cleanup
export async function cleanupTestDb() {
  const logger = new Logger({ projectId: 'test' });
  const pool = new Pool(testConfig.storage.config);
  
  try {
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public');
    logger.info('Test database cleaned up');
  } catch (error) {
    // Type-safe error handling
    logger.error('Failed to cleanup test database:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  } finally {
    await pool.end();
  }
}

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
  await cleanupTestDb();
});

// Add mock data generators
export const createMockGitHubMetrics = (): GitHubMetrics => ({
  timestamp: Date.now(),
  projectId: 'test-project',
  commits: {
    count: 10,
    frequency: 2.5,
    authors: ['user1', 'user2']
  },
  pullRequests: {
    open: 5,
    merged: 15,
    authors: ['user1', 'user2']
  },
  issues: {
    open: 3,
    closed: 12,
    participants: ['user1', 'user2', 'user3']
  },
  metadata: {
    collectionTimestamp: Date.now(),
    source: 'github',
    projectId: 'test-project',
    periodStart: Date.now() - (7 * 24 * 60 * 60 * 1000),
    periodEnd: Date.now()
  }
});
