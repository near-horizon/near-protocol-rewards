import { Logger } from '../utils/logger';
import { PostgresStorage } from '../storage/postgres';
import { GitHubMetrics, NEARMetrics, ProcessedMetrics, StoredMetrics, ValidationError } from '../types';
import { MetricsAggregator } from './metrics-aggregator';
import { BaseError, ErrorCode } from '../utils/errors';
import { createHash } from 'crypto';

export class DataAggregator {
  constructor(
    private readonly logger: Logger,
    private readonly storage: PostgresStorage,
    private readonly metricsAggregator: MetricsAggregator
  ) {}

  async aggregateData(
    projectId: string,
    github: GitHubMetrics,
    near: NEARMetrics
  ): Promise<ProcessedMetrics> {
    try {
      this.validateInputData(github, near);
      const timestamp = Date.now();
      const score = this.metricsAggregator.aggregate(github, near);

      const processed: ProcessedMetrics = {
        timestamp,
        github,
        near,
        score,
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
          timestamp,
          metadata: {
            source: 'github',
            validationType: 'data'
          }
        },
        metadata: {
          collectionTimestamp: timestamp,
          source: 'github',
          projectId,
          periodStart: Math.min(
            github.metadata.collectionTimestamp,
            near.metadata.collectionTimestamp
          ),
          periodEnd: timestamp
        }
      };

      const signature = this.generateSignature(processed);

      const storedMetrics: StoredMetrics = {
        github,
        near,
        processed,
        signature,
        projectId,
        timestamp,
        score: processed.score // Add score from processed metrics
      };

      await this.storage.saveMetrics(projectId, storedMetrics);
      return processed;
    } catch (error) {
      this.logger.error('Aggregation failed', { error, projectId });
      throw error;
    }
  }

  private generateSignature(data: ProcessedMetrics): string {
    return createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  private validateInputData(github: GitHubMetrics, near: NEARMetrics): void {
    const errors: ValidationError[] = [];
    
    // Validate GitHub data
    if (!github?.metadata?.collectionTimestamp) {
      errors.push({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Missing GitHub collection timestamp'
      });
    }

    // Validate NEAR data
    if (!near?.metadata?.collectionTimestamp) {
      errors.push({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Missing NEAR collection timestamp'
      });
    }

    // Validate timestamps are within acceptable range
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (github?.metadata?.collectionTimestamp && 
        now - github.metadata.collectionTimestamp > maxAge) {
      errors.push({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'GitHub data is too old'
      });
    }

    if (near?.metadata?.collectionTimestamp && 
        now - near.metadata.collectionTimestamp > maxAge) {
      errors.push({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'NEAR data is too old'
      });
    }

    if (errors.length > 0) {
      throw new BaseError(
        'Input data validation failed',
        ErrorCode.VALIDATION_ERROR,
        { errors }
      );
    }
  }

  async getLatestMetrics(projectId: string): Promise<ProcessedMetrics | null> {
    return this.storage.getLatestMetrics(projectId);
  }
}
