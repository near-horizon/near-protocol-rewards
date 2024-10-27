import { Logger } from '../utils/logger';
import { PostgresStorage } from '../storage/postgres';
import { GitHubMetrics, NEARMetrics, ProcessedMetrics } from '../types';
import { MetricsAggregator } from './metrics-aggregator';
import { BaseError, ErrorCode } from '../utils/errors';

interface DataAggregatorConfig {
  logger: Logger;
  storage: PostgresStorage;
  metricsAggregator: MetricsAggregator;
  sampling?: { rate: number };
}

export class DataAggregator {
  private readonly logger: Logger;
  private readonly storage: PostgresStorage;
  private readonly metricsAggregator: MetricsAggregator;
  private readonly samplingRate: number;
  
  constructor(config: DataAggregatorConfig) {
    this.logger = config.logger;
    this.storage = config.storage;
    this.metricsAggregator = config.metricsAggregator;
    this.samplingRate = config.sampling?.rate ?? 1.0; // 100%
    
    if (this.samplingRate < 1.0) {
      this.logger.info(`Sampling enabled at ${this.samplingRate * 100}%`);
    }
  }

  async aggregateData(
    projectId: string,
    githubMetrics: GitHubMetrics,
    nearMetrics: NEARMetrics
  ): Promise<ProcessedMetrics> {
    try {
      // Handle sampling by creating a minimal metrics object if sampled out
      if (Math.random() > this.samplingRate) {
        this.logger.info('Skipping detailed metrics collection due to sampling', { projectId });
        const timestamp = Date.now();
        return {
          timestamp,
          github: githubMetrics,
          near: nearMetrics,
          score: {
            total: 0,
            breakdown: {
              github: 0,
              near: 0
            }
          },
          validation: {
            isValid: true,
            errors: [],
            warnings: [{
              code: 'SAMPLED_OUT',
              message: 'Metrics sampled out based on configuration',
              context: { samplingRate: this.samplingRate }
            }],
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
              githubMetrics.metadata.collectionTimestamp,
              nearMetrics.metadata.collectionTimestamp
            ),
            periodEnd: timestamp
          }
        };
      }

      const aggregated = this.metricsAggregator.aggregateMetrics(
        githubMetrics,
        nearMetrics
      );

      const timestamp = Date.now();
      const processedMetrics: ProcessedMetrics = {
        timestamp,
        github: githubMetrics,
        near: nearMetrics,
        score: {
          total: aggregated.total,
          breakdown: {
            github: aggregated.github.total,
            near: aggregated.near.total
          }
        },
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
            githubMetrics.metadata.collectionTimestamp,
            nearMetrics.metadata.collectionTimestamp
          ),
          periodEnd: timestamp
        }
      };

      await this.storage.saveMetrics(projectId, processedMetrics);
      return processedMetrics;
    } catch (error) {
      this.logger.error('Failed to aggregate data', { error, projectId });
      throw new BaseError(
        'Data aggregation failed',
        ErrorCode.AGGREGATION_ERROR,
        { error, projectId }
      );
    }
  }

  async getLatestMetrics(projectId: string): Promise<ProcessedMetrics | null> {
    return this.storage.getLatestMetrics(projectId);
  }
}
