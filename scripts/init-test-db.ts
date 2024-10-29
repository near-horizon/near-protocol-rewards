import { Pool } from 'pg';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import util from 'util';

dotenv.config({ path: '.env.test' });

const execPromise = util.promisify(exec);

async function initTestDb() {
  // Ensure the postgres service is running
  try {
    await execPromise('pg_isready');
  } catch (error) {
    console.error('PostgreSQL is not running. Please start PostgreSQL service.');
    process.exit(1);
  }

  const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD
  });

  try {
    // Drop existing tables if they exist
    await pool.query('DROP TABLE IF EXISTS metrics CASCADE');

    // Create metrics table
    await pool.query(`
      CREATE TABLE metrics (
        id SERIAL PRIMARY KEY,
        project_id VARCHAR(255) NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Add indexes
      CREATE INDEX idx_project_id ON metrics(project_id);
      CREATE INDEX idx_created_at ON metrics(created_at);
    `);

    console.log('Test database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize test database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

initTestDb().catch(console.error); 