import { Pool, PoolConfig } from 'pg';
import { Logger } from '../utils/logger';
import { GitHubMetrics, NEARMetrics, AggregatedMetrics } from '../types';
import { BaseError, ErrorCode } from '../utils/errors';

interface StorageConfig {
  logger: Logger;
  connectionConfig: PoolConfig;
}

export class PostgresStorage {
  private readonly pool: Pool;
  private readonly logger: Logger;

  constructor(config: StorageConfig) {
    this.logger = config.logger;
    this.pool = new Pool({
      ...config.connectionConfig,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      this.logger.error('Unexpected error on idle client', { error: err });
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.createTables();
      this.logger.info('PostgreSQL storage initialized');
    } catch (error) {
      this.logger.error('Failed to initialize storage', { error });
      throw new BaseError(
        'Storage initialization failed',
        ErrorCode.DATABASE_ERROR,
        { error }
      );
    }
  }

  private async createTables(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Metrics table
      await client.query(`
        CREATE TABLE IF NOT EXISTS metrics (
          id SERIAL PRIMARY KEY,
          project_id VARCHAR(255) NOT NULL,
          timestamp BIGINT NOT NULL,
          github_metrics JSONB NOT NULL,
          near_metrics JSONB NOT NULL,
          aggregated_metrics JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Projects table
      await client.query(`
        CREATE TABLE IF NOT EXISTS projects (
          id VARCHAR(255) PRIMARY KEY,
          near_account VARCHAR(255) NOT NULL,
          github_repo VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Indexes for efficient queries
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_metrics_project_timestamp 
        ON metrics(project_id, timestamp)
      `);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async saveMetrics(
    projectId: string,
    metrics: AggregatedMetrics
  ): Promise<void> {
    const query = `
      INSERT INTO metrics (
        project_id, 
        timestamp, 
        github_metrics, 
        near_metrics, 
        aggregated_metrics
      ) VALUES ($1, $2, $3, $4, $5)
    `;

    try {
      await this.executeWithRetry(() => 
        this.pool.query(query, [
          projectId,
          metrics.timestamp,
          metrics.github,
          metrics.near,
          metrics
        ])
      );
      this.logger.info('Metrics saved successfully', { projectId });
    } catch (error) {
      this.logger.error('Failed to save metrics', { error, projectId });
      throw new BaseError(
        'Failed to save metrics',
        ErrorCode.DATABASE_ERROR,
        { error }
      );
    }
  }

  async getLatestMetrics(projectId: string): Promise<AggregatedMetrics | null> {
    const query = `
      SELECT aggregated_metrics 
      FROM metrics 
      WHERE project_id = $1 
      ORDER BY timestamp DESC 
      LIMIT 1
    `;

    try {
      const result = await this.executeWithRetry(() =>
        this.pool.query(query, [projectId])
      );
      return result.rows[0]?.aggregated_metrics || null;
    } catch (error) {
      this.logger.error('Failed to get latest metrics', { error, projectId });
      throw new BaseError(
        'Failed to get metrics',
        ErrorCode.DATABASE_ERROR,
        { error }
      );
    }
  }

  async getMetricsHistory(
    projectId: string,
    startTime: number,
    endTime: number
  ): Promise<AggregatedMetrics[]> {
    const query = `
      SELECT aggregated_metrics 
      FROM metrics 
      WHERE project_id = $1 
        AND timestamp >= $2 
        AND timestamp <= $3 
      ORDER BY timestamp ASC
    `;

    try {
      const result = await this.executeWithRetry(() =>
        this.pool.query(query, [projectId, startTime, endTime])
      );
      return result.rows.map(row => row.aggregated_metrics);
    } catch (error) {
      this.logger.error('Failed to get metrics history', { error, projectId });
      throw new BaseError(
        'Failed to get metrics history',
        ErrorCode.DATABASE_ERROR,
        { error }
      );
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries = 3,
    delay = 1000
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        this.logger.warn('Retrying database operation', {
          retriesLeft: retries - 1,
          delay
        });
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(
          operation,
          retries - 1,
          delay * 2
        );
      }
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    await this.pool.end();
  }
}
