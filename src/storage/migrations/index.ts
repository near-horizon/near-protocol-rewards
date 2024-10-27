import { Pool } from 'pg';
import { Logger } from '../../utils/logger';
import { BaseError, ErrorCode } from '../../utils/errors';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { readFileSync } from 'fs';
import { formatError } from '../../utils/format-error';
import { LogContext } from '../../types/common';

interface Migration {
  id: number;
  name: string;
  timestamp: number;
  applied: boolean;
}

export class MigrationManager {
  constructor(
    private readonly pool: Pool,
    private readonly logger: Logger,
    private readonly migrationsPath: string = join(__dirname, 'migrations')
  ) {}

  async migrate(): Promise<void> {
    try {
      await this.createMigrationsTable();
      const migrations = await this.getPendingMigrations();
      
      for (const migration of migrations) {
        await this.runMigration(migration);
      }
    } catch (error) {
      this.logger.error('Migration failed', {
        error: formatError(error),
        context: {
          operation: 'migrate',
          migrationsPath: this.migrationsPath
        }
      });
      throw new BaseError(
        'Migration failed',
        ErrorCode.DATABASE_ERROR,
        { error: formatError(error) }
      );
    }
  }

  private async createMigrationsTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        timestamp BIGINT NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private async getPendingMigrations(): Promise<Migration[]> {
    const files = await readdir(this.migrationsPath);
    const appliedMigrations = await this.getAppliedMigrations();
    
    return files
      .filter(f => f.endsWith('.ts'))
      .map(file => ({
        id: parseInt(file.split('_')[0]),
        name: file,
        timestamp: Date.now(),
        applied: appliedMigrations.includes(file)
      }))
      .filter(m => !m.applied)
      .sort((a, b) => a.id - b.id);
  }

  private async getAppliedMigrations(): Promise<string[]> {
    const { rows } = await this.pool.query(
      'SELECT name FROM migrations ORDER BY id ASC'
    );
    return rows.map(row => row.name);
  }

  private async runMigration(migration: Migration): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      const { up } = require(join(this.migrationsPath, migration.name));
      await up(client);
      
      await client.query(
        'INSERT INTO migrations (name, timestamp) VALUES ($1, $2)',
        [migration.name, migration.timestamp]
      );
      
      await client.query('COMMIT');
      
      this.logger.info('Migration applied successfully', { 
        migration: migration.name 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export async function runMigrations(pool: Pool, logger: Logger): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    // Create migrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Read and execute initial schema
    const schemaPath = join(__dirname, '001_initial.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    await client.query(schema);

    // Record migration
    await client.query(
      'INSERT INTO migrations (name) VALUES ($1) ON CONFLICT DO NOTHING',
      ['001_initial']
    );

    await client.query('COMMIT');
    logger.info('Migrations completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Migration failed', {
      error: formatError(error),
      context: { 
        operation: 'runMigrations',
        phase: 'execution'
      }
    });
    throw new BaseError(
      'Database migration failed',
      ErrorCode.DATABASE_ERROR,
      { error: formatError(error) }
    );
  } finally {
    client.release();
  }
}
