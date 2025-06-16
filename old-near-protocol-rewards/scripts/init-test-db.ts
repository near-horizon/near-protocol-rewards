import { Pool } from 'pg';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import util from 'util';

dotenv.config({ path: '.env.test' });

const execPromise = util.promisify(exec);

async function initTestDb() {
  try {
    await execPromise('pg_isready');
  } catch (error) {
    console.error('PostgreSQL is not running. Please start PostgreSQL service.');
    process.exit(1);
  }

  const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: 'postgres',
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD
  });

  try {
    // Create test database if it doesn't exist
    await pool.query(`
      SELECT 'CREATE DATABASE ${process.env.POSTGRES_DB}'
      WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${process.env.POSTGRES_DB}')
    `);

    // Connect to test database
    await pool.end();
    const testPool = new Pool({
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD
    });

    // Create tables
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS metrics (
        id SERIAL PRIMARY KEY,
        project_id VARCHAR(255) NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS error_logs (
        id SERIAL PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS metadata (
        id SERIAL PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Add indexes
      CREATE INDEX IF NOT EXISTS idx_project_id ON metrics(project_id);
      CREATE INDEX IF NOT EXISTS idx_created_at ON metrics(created_at);
      CREATE INDEX IF NOT EXISTS idx_error_created_at ON error_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_metadata_created_at ON metadata(created_at);
    `);

    console.log('Test database initialized successfully');
    await testPool.end();
  } catch (error) {
    console.error('Failed to initialize test database:', error);
    throw error;
  }
}

initTestDb().catch(console.error);