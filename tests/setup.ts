import dotenv from 'dotenv';
import { Pool } from 'pg';
import { ConsoleLogger } from '../src/utils/logger';
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

// Simplified test setup
export const testConfig = {
  projectId: 'test-project',
  nearAccount: process.env.NEAR_ACCOUNT!,
  githubRepo: process.env.GITHUB_REPO!,
  githubToken: process.env.GITHUB_TOKEN!,
  storage: {
    type: 'postgres' as const,
    config: {
      host: process.env.POSTGRES_HOST!,
      port: parseInt(process.env.POSTGRES_PORT!),
      database: process.env.POSTGRES_DB!,
      user: process.env.POSTGRES_USER!,
      password: process.env.POSTGRES_PASSWORD!
    }
  }
};

// Simple mock data
export const createMockMetrics = () => ({
  github: { /* minimal github data */ },
  near: { /* minimal near data */ }
});

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
  const pool = new Pool(testConfig.storage.config);
  const logger = new ConsoleLogger('debug');
  
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
  const logger = new ConsoleLogger('debug');
  const pool = new Pool(testConfig.storage.config);
  
  try {
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public');
    logger.info('Test database cleaned up');
  } catch (error) {
    logger.error('Failed to cleanup test database:', {
      error: formatError(error),
      context: { operation: 'cleanup' }
    });
    throw error;
  } finally {
    await pool.end();
  }
}

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

  // Verify GitHub token format
  const token = process.env.GITHUB_TOKEN;
  if (!token?.startsWith('ghp_') || token.length !== 40) {
    throw new Error('Invalid GitHub token format. Token should start with "ghp_" and be 40 characters long');
  }

  // Verify GitHub repo format
  const repo = process.env.GITHUB_REPO;
  if (!repo?.includes('/')) {
    throw new Error('Invalid GitHub repo format. Should be in format "owner/repo"');
  }

  // Add validation for NEAR API key
  if (!process.env.NEAR_API_KEY) {
    throw new Error('Missing NEAR_API_KEY environment variable');
  }

  // Add validation for NEAR account format
  const nearAccount = process.env.NEAR_ACCOUNT;
  if (!nearAccount?.endsWith('.near') && !nearAccount?.endsWith('.testnet')) {
    throw new Error('Invalid NEAR account format. Should end with .near or .testnet');
  }
}

beforeAll(async () => {
  validateTestEnvironment();
  await setupTestDb();
});
