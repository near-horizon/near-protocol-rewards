import { Pool, PoolConfig } from 'pg';
import { Logger } from '../utils/logger';
import { GitHubMetrics, NEARMetrics, ProcessedMetrics } from '../types';
import { BaseError, ErrorCode } from '../utils/errors';

export interface StoredMetrics {
  github: GitHubMetrics;
  near: NEARMetrics;
  processed: ProcessedMetrics;
  signature: string;
}

export class PostgresStorage {
  private readonly pool: Pool;
  private readonly logger: Logger;

  constructor(config: { connectionConfig: PoolConfig; logger: Logger }) {
    this.pool = new Pool(config.connectionConfig);
    this.logger = config.logger;
  }

  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS metrics (
          id SERIAL PRIMARY KEY,
          project_id VARCHAR(255) NOT NULL,
          github_metrics JSONB NOT NULL,
          near_metrics JSONB NOT NULL,
          processed_metrics JSONB NOT NULL,
          signature VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(project_id, created_at)
        );
        
        CREATE INDEX IF NOT EXISTS idx_metrics_project_date 
        ON metrics(project_id, created_at DESC);
      `);
    } finally {
      client.release();
    }
  }

  async getProjectStatus(projectId: string) {
    const result = await this.pool.query(
      `SELECT 
        MAX(created_at) as last_collection,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as collection_count,
        bool_or(processed_metrics->>'isHealthy') as is_healthy
       FROM metrics 
       WHERE project_id = $1`,
      [projectId]
    );

    return {
      lastCollection: result.rows[0].last_collection,
      isHealthy: result.rows[0].is_healthy,
      recentErrors: [],
      nextScheduledCollection: Date.now() + (60 * 60 * 1000) // 1 hour from now
    };
  }

  async saveMetrics(projectId: string, metrics: StoredMetrics): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO metrics 
         (project_id, github_metrics, near_metrics, processed_metrics, signature)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          projectId,
          metrics.github,
          metrics.near,
          metrics.processed,
          metrics.signature
        ]
      );
    } catch (error) {
      this.logger.error('Failed to save metrics', { error, projectId });
      throw new BaseError(
        'Database operation failed',
        ErrorCode.DATABASE_ERROR,
        { error }
      );
    }
  }

  async getLatestMetrics(projectId: string): Promise<ProcessedMetrics | null> {
    try {
      const result = await this.pool.query(
        `SELECT processed_metrics 
         FROM metrics 
         WHERE project_id = $1 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [projectId]
      );

      return result.rows[0]?.processed_metrics || null;
    } catch (error) {
      this.logger.error('Failed to get latest metrics', { error, projectId });
      throw new BaseError(
        'Database query failed',
        ErrorCode.DATABASE_ERROR,
        { error }
      );
    }
  }

  async getMetricsHistory(
    projectId: string,
    limit: number = 30
  ): Promise<ProcessedMetrics[]> {
    try {
      const result = await this.pool.query(
        `SELECT processed_metrics 
         FROM metrics 
         WHERE project_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [projectId, limit]
      );

      return result.rows.map(row => row.processed_metrics);
    } catch (error) {
      this.logger.error('Failed to get metrics history', { error, projectId });
      throw new BaseError(
        'Database query failed',
        ErrorCode.DATABASE_ERROR,
        { error }
      );
    }
  }

  async cleanup(): Promise<void> {
    await this.pool.end();
  }
}
