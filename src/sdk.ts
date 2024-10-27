import { EventEmitter } from 'events';
import { GitHubCollector } from './collectors/github';
import { NEARCollector } from './collectors/near';
import { MetricsAggregator } from './aggregator/metrics-aggregator';
import { PostgresStorage } from './storage/postgres';
import { Logger } from './utils/logger';
import { SDKConfig, ProcessedMetrics } from './types';
import { BaseError, ErrorCode } from './utils/errors';

export class NEARProtocolRewardsSDK extends EventEmitter {
  private readonly collectors: {
    github: GitHubCollector;
    near: NEARCollector;
  };
  private readonly aggregator: MetricsAggregator;
  private readonly storage?: PostgresStorage;
  private readonly logger: Logger;
  private readonly projectId: string;
  private collectionInterval?: NodeJS.Timeout;

  constructor(config: SDKConfig) {
    super();
    
    this.projectId = config.projectId;
    this.logger = new Logger({ projectId: config.projectId });
    
    // Initialize collectors
    this.collectors = {
      github: new GitHubCollector({
        repo: config.githubRepo,
        token: config.githubToken,
        logger: this.logger
      }),
      near: new NEARCollector({
        account: config.nearAccount,
        logger: this.logger
      })
    };

    // Initialize aggregator
    this.aggregator = new MetricsAggregator({ logger: this.logger });

    // Initialize storage if configured
    if (config.storage?.type === 'postgres') {
      this.storage = new PostgresStorage(config.storage.config, this.logger);
    }
  }

  async startTracking(): Promise<void> {
    try {
      await this.collectMetrics();
      
      // Set up interval for continuous collection
      this.collectionInterval = setInterval(
        () => this.collectMetrics().catch(this.handleError.bind(this)),
        5 * 60 * 1000 // 5 minutes
      );
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async stopTracking(): Promise<void> {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = undefined;
    }
  }

  private async collectMetrics(): Promise<void> {
    try {
      const [github, near] = await Promise.all([
        this.collectors.github.collectMetrics(),
        this.collectors.near.collectMetrics()
      ]);

      const aggregated = this.aggregator.aggregateMetrics(github, near);
      const timestamp = Date.now();

      // Format metrics according to ProcessedMetrics type
      const processed: ProcessedMetrics = {
        timestamp,
        github,
        near,
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
          projectId: this.projectId,
          periodStart: Math.min(
            github.metadata.collectionTimestamp,
            near.metadata.collectionTimestamp
          ),
          periodEnd: timestamp
        }
      };
      
      if (this.storage) {
        await this.storage.saveMetrics(this.projectId, processed);
      }

      this.emit('metrics:collected', processed);
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async getMetrics(projectId?: string): Promise<ProcessedMetrics | null> {
    if (!this.storage) {
      throw new BaseError(
        'Storage not configured',
        ErrorCode.INTERNAL_ERROR,
        { projectId }
      );
    }
    return this.storage.getLatestMetrics(projectId || this.projectId);
  }

  private handleError(error: unknown): void {
    const sdkError = error instanceof BaseError ? error : new BaseError(
      'SDK operation failed',
      ErrorCode.INTERNAL_ERROR,
      { originalError: error }
    );
    
    this.emit('error', sdkError);
  }

  async cleanup(): Promise<void> {
    await this.stopTracking();
    if (this.storage) {
      await this.storage.cleanup();
    }
  }
}
