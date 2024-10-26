import { Pool } from 'pg';
import { Logger } from '../../utils/logger';
import { BaseError, ErrorCode } from '../../utils/errors';
import { readdir } from 'fs/promises';
import { join } from 'path';

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
      this.logger.error('Migration failed', { error });
      throw new BaseError(
        'Migration failed',
        ErrorCode.DATABASE_ERROR,
        { error }
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
