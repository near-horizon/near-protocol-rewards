/**
 * PostgreSQL Storage Implementation
 * 
 * Handles persistent storage of metrics with transaction support
 * and retry logic for resilience. Features:
 * - Transaction management
 * - Automatic retries for transient failures
 * - Data validation before storage
 * - Health checks
 * 
 * @example
 * ```typescript
 * const storage = new PostgresStorage({
 *   connectionConfig: config,
 *   logger: logger
 * });
 * await storage.saveMetrics(projectId, metrics);
 * ```
 */

import { Pool, PoolConfig } from 'pg';
import { Logger } from '../utils/logger';
import { ProcessedMetrics, StoredMetrics } from '../types';
import { BaseError, ErrorCode } from '../utils/errors';
import { formatError } from '../utils/format-error';
import { LogContext } from '../types/common';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

export class PostgresStorage {
  private readonly pool: Pool;
  private readonly logger: Logger;
  private readonly retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 5000
  };

  constructor(config: { connectionConfig: PoolConfig; logger: Logger }) {
    this.pool = new Pool(config.connectionConfig);
    this.logger = config.logger;
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = this.retryConfig.baseDelay;

    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (!this.isRetryableError(error)) {
          this.logger.error('Non-retryable error encountered', {
            error: formatError(error),
            context: {
              operation: context,
              attempt,
              retryable: false
            }
          });
          throw error;
        }

        if (attempt === this.retryConfig.maxRetries) break;

        this.logger.warn('Retrying operation', {
          error: formatError(error),
          context: {
            operation: context,
            attempt,
            delay,
            retryable: true
          }
        });

        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, this.retryConfig.maxDelay);
      }
    }

    throw new BaseError(
      `Operation failed after ${this.retryConfig.maxRetries} retries`,
      ErrorCode.DATABASE_ERROR,
      { context, error: formatError(lastError) }
    );
  }

  private isRetryableError(error: any): boolean {
    const retryableCodes = [
      '40001', // serialization_failure
      '40P01', // deadlock_detected
      '55P03', // lock_not_available
      '57P05'  // crash_shutdown
    ];

    return (
      error.code && retryableCodes.includes(error.code) ||
      error.message?.toLowerCase().includes('connection')
    );
  }

  async initialize(): Promise<void> {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS metrics (
          id SERIAL PRIMARY KEY,
          project_id VARCHAR(255) NOT NULL,
          timestamp BIGINT NOT NULL,
          collection_timestamp BIGINT NOT NULL,
          github_metrics JSONB NOT NULL,
          near_metrics JSONB NOT NULL,
          processed_metrics JSONB NOT NULL,
          validation_result JSONB NOT NULL,
          signature VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_metrics_project_timestamp 
        ON metrics(project_id, timestamp DESC);
      `);
    } catch (error) {
      this.logger.error('Failed to initialize database', {
        error: formatError(error),
        context: { operation: 'initialize' }
      });
      throw new BaseError(
        'Database initialization failed',
        ErrorCode.DATABASE_ERROR,
        { error: formatError(error) }
      );
    }
  }

  async saveMetrics(projectId: string, metrics: StoredMetrics): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO metrics (
          project_id,
          timestamp,
          collection_timestamp,
          github_metrics,
          near_metrics,
          processed_metrics,
          validation_result,
          signature
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          projectId,
          metrics.timestamp,
          Date.now(), // collection_timestamp
          metrics.github,
          metrics.near,
          metrics.processed,
          metrics.processed.validation, // validation_result
          metrics.signature
        ]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Failed to save metrics', {
        error: formatError(error),
        context: { 
          operation: 'saveMetrics',
          projectId 
        }
      });
      throw new BaseError(
        'Failed to save metrics',
        ErrorCode.DATABASE_ERROR,
        { error: formatError(error) }
      );
    } finally {
      client.release();
    }
  }

  private validateMetrics(metrics: StoredMetrics): void {
    if (!metrics.github || !metrics.near || !metrics.processed) {
      throw new BaseError(
        'Invalid metrics data',
        ErrorCode.VALIDATION_ERROR,
        { 
          validationError: {
            type: 'missing_data',
            fields: {
              hasGithub: !!metrics.github,
              hasNear: !!metrics.near,
              hasProcessed: !!metrics.processed
            }
          }
        }
      );
    }

    if (!metrics.signature) {
      throw new BaseError(
        'Missing metrics signature',
        ErrorCode.VALIDATION_ERROR,
        { 
          validationError: {
            type: 'missing_signature',
            timestamp: metrics.timestamp
          }
        }
      );
    }

    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (now - metrics.processed.timestamp > maxAge) {
      throw new BaseError(
        'Metrics too old',
        ErrorCode.VALIDATION_ERROR,
        { 
          timestamp: metrics.processed.timestamp,
          maxAge,
          currentTime: now
        }
      );
    }
  }

  async getLatestMetrics(projectId: string): Promise<ProcessedMetrics | null> {
    try {
      const result = await this.pool.query(
        `SELECT processed_metrics, validation_result
         FROM metrics
         WHERE project_id = $1
         ORDER BY collection_timestamp DESC
         LIMIT 1`,
        [projectId]
      );

      if (!result.rows[0]) return null;

      const metrics = result.rows[0].processed_metrics;
      metrics.validation = result.rows[0].validation_result;
      
      return metrics;
    } catch (error) {
      this.logger.error('Failed to get metrics', {
        error: formatError(error),
        context: {
          operation: 'getLatestMetrics',
          projectId
        }
      });
      throw new BaseError(
        'Failed to get metrics',
        ErrorCode.DATABASE_ERROR,
        { error: formatError(error) }
      );
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (error) {
      this.logger.error('Health check failed', {
        error: formatError(error),
        context: { operation: 'healthCheck' }
      });
      return false;
    }
  }

  async cleanupOldData(days: number = 30): Promise<void> {
    await this.withRetry(async () => {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          'DELETE FROM metrics WHERE created_at < NOW() - INTERVAL \'$1 days\'',
          [days]
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }, 'cleanupOldData');
  }

  async cleanup(): Promise<void> {
    await this.pool.end();
  }

  async getMetricsHistory(
    projectId: string,
    startTime: number,
    endTime: number
  ): Promise<ProcessedMetrics[]> {
    try {
      const result = await this.pool.query(
        `SELECT processed_metrics
         FROM metrics
         WHERE project_id = $1
           AND timestamp >= $2
           AND timestamp <= $3
         ORDER BY timestamp DESC`,
        [projectId, startTime, endTime]
      );

      return result.rows.map(row => row.processed_metrics);
    } catch (error) {
      this.logger.error('Failed to get metrics history', {
        error: formatError(error),
        context: { 
          operation: 'getMetricsHistory',
          projectId 
        }
      });
      throw new BaseError(
        'Failed to get metrics history',
        ErrorCode.DATABASE_ERROR,
        { error: formatError(error) }
      );
    }
  }
}
