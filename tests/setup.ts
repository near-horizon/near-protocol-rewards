import { PostgresStorage } from '../src/storage/postgres';
import { Logger } from '../src/utils/logger';
import { NEARProtocolRewardsSDK } from '../src/sdk';
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
  const storage = new PostgresStorage(testConfig.storage.config, logger);
  
  try {
    // Run migrations
    const migrationQueries = [
      // Add migration queries here
    ];
    
    for (const query of migrationQueries) {
      await storage.pool.query(query);
    }
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}
