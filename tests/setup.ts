import { Pool } from 'pg';
import { Logger } from '../src/utils/logger';
import { PostgresStorage } from '../src/storage/postgres';
import { GitHubMetrics } from '../src/types';
import dotenv from 'dotenv';

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
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

// Mock data generators
export const createMockGitHubMetrics = (): GitHubMetrics => ({
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
  },
  timestamp: 0,
  projectId: ''
});
