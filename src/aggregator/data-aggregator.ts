import { GitHubMetrics, NEARMetrics, ProcessedMetrics } from '../types';
import { Logger } from '../utils/logger';
import { MetricsAggregator } from './metrics-aggregator';
import { PostgresStorage } from '../storage/postgres';
import { EventEmitter } from 'events';
import { BaseError, ErrorCode } from '../utils/errors';

interface DataAggregatorConfig {
  logger: Logger;
  storage: PostgresStorage;
  metricsAggregator: MetricsAggregator;
}

export class DataAggregator extends EventEmitter {
  private readonly logger: Logger;
  private readonly storage: PostgresStorage;
  private readonly metricsAggregator: MetricsAggregator;

  constructor(config: DataAggregatorConfig) {
    super();
    this.logger = config.logger;
    this.storage = config.storage;
    this.metricsAggregator = config.metricsAggregator;
  }

  async aggregateData(
    projectId: string,
    github: GitHubMetrics,
    near: NEARMetrics
  ): Promise<ProcessedMetrics> {
    try {
      // Calculate scores using MetricsAggregator
      const aggregatedMetrics = this.metricsAggregator.aggregateMetrics(github, near);

      // Create processed metrics
      const processedMetrics: ProcessedMetrics = {
        timestamp: Date.now(),
        github,
        near,
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
          timestamp: Date.now(),
          metadata: {
            source: 'github',
            validationType: 'data'
          }
        },
        metadata: {
          projectId,
          calculationTimestamp: Date.now(),
          periodStart: this.getPeriodStart(),
          periodEnd: Date.now()
        }
      };

      // Store in database
      await this.storage.saveMetrics(projectId, processedMetrics);

      // Emit event for real-time updates
      this.emit('metrics:processed', processedMetrics);

      return processedMetrics;
    } catch (error) {
      this.logger.error('Failed to aggregate data', { error, projectId });
      throw new BaseError(
        'Data aggregation failed',
        ErrorCode.COLLECTION_ERROR,
        { error }
      );
    }
  }

  private getPeriodStart(): number {
    // Default to 30 days ago
    return Date.now() - (30 * 24 * 60 * 60 * 1000);
  }

  async getHistoricalData(
    projectId: string,
    startTime: number,
    endTime: number
  ): Promise<ProcessedMetrics[]> {
    return this.storage.getMetricsHistory(projectId, startTime, endTime);
  }
}
