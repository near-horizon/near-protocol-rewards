/* eslint-disable @typescript-eslint/no-non-null-assertion */

import dotenv from 'dotenv';
import { Pool } from 'pg';
import { Logger } from '../src/utils/logger';
import { PostgresStorage } from '../src/storage/postgres';
import { GitHubMetrics } from '../src/types';
import { formatError } from '../src/utils/format-error';

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

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test setup
beforeAll(async () => {
  await setupTestDb();
});

// Global test teardown
afterAll(async () => {
  await cleanupTestDb();
});

// Database setup and cleanup functions
export async function setupTestDb() {
  const poolConfig = {
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT!),
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD
  };

  const pool = new Pool(poolConfig);
  const logger = new Logger({ projectId: 'test' });

  try {
    // Create test tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS metrics (
        id SERIAL PRIMARY KEY,
        project_id VARCHAR(255) NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (error) {
    logger.error('Failed to setup test database', {
      error: formatError(error),
      context: { operation: 'setup' }
    });
    throw error;
  } finally {
    await pool.end();
  }
}

export async function cleanupTestDb() {
  const logger = new Logger({ projectId: 'test' });
  const pool = new Pool(testConfig.storage.config);
  
  try {
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public');
    logger.info('Test database cleaned up');
  } catch (error) {
    logger.error('Failed to cleanup test database:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  } finally {
    await pool.end();
  }
}

// Mock data generators
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

// Add test environment validation
function validateTestEnvironment() {
  const required = [
    'GITHUB_TOKEN',
    'GITHUB_REPO',
    'NEAR_ACCOUNT',
    'POSTGRES_HOST',
    'POSTGRES_PORT',
    'POSTGRES_DB',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD'
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required test environment variables: ${missing.join(', ')}`);
  }
}

beforeAll(async () => {
  validateTestEnvironment();
  await setupTestDb();
});
