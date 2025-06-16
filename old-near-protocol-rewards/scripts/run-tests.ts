import dotenv from 'dotenv';
import { Pool } from 'pg';
import { runMigrations } from '../src/storage/migrations';
import { Logger } from '../src/utils/logger';

async function setupTestEnvironment() {
  // Load test environment variables
  dotenv.config({ path: '.env.test' });

  const logger = new Logger({ projectId: 'test' });

  // Create test database pool
  const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT!, 10),
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD
  });

  try {
    // Run migrations
    await runMigrations(pool, logger);
    logger.info('Test environment setup complete');
  } catch (error) {
    logger.error('Failed to setup test environment', { error });
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run setup if called directly
if (require.main === module) {
  setupTestEnvironment().catch(console.error);
}

export { setupTestEnvironment };
