/**
 * NEAR Protocol Rewards SDK
 * 
 * The main SDK class that handles metrics collection, processing, and storage
 * for NEAR Protocol project rewards. This SDK tracks both GitHub development
 * activity and NEAR blockchain usage to calculate project rewards.
 * 
 * Basic usage:
 * ```typescript
 * const sdk = new NEARProtocolRewardsSDK({
 *   projectId: 'my-project',
 *   nearAccount: 'account.testnet',
 *   githubRepo: 'owner/repo',
 *   githubToken: process.env.GITHUB_TOKEN
 * });
 * 
 * sdk.on('metrics:collected', (metrics) => {
 *   console.log('New metrics:', metrics);
 * });
 * ```
 * 
 * @packageDocumentation
 */

import { EventEmitter } from 'events';
import { GitHubCollector } from './collectors/github';
import { NEARCollector } from './collectors/near';
import { MetricsAggregator } from './aggregator/metrics-aggregator';
import { PostgresStorage } from './storage/postgres';
import { Logger } from './utils/logger';
import { 
  GitHubMetrics, 
  NEARMetrics,
  ProcessedMetrics,
  StoredMetrics,
  ValidationResult 
} from './types/metrics';
import { BaseError, ErrorCode } from './types/errors';
import { createHash } from 'crypto';
import { formatError } from './utils/format-error';
import { SDKConfig, RequiredSDKConfig } from './types/sdk';
import { toJSONValue } from './types/json';

export class NEARProtocolRewardsSDK extends EventEmitter {
  private readonly logger: Logger;
  private readonly githubCollector: GitHubCollector;
  private readonly nearCollector: NEARCollector;
  private readonly aggregator: MetricsAggregator;
  private readonly storage?: PostgresStorage;
  private collectionInterval: NodeJS.Timeout | null = null;
  private readonly config: RequiredSDKConfig;

  constructor(config: SDKConfig) {
    super();
    this.validateConfig(config);
    
    // Set default values
    this.config = {
      ...config,
      trackingInterval: config.trackingInterval || 5 * 60 * 1000,
      maxRequestsPerSecond: config.maxRequestsPerSecond || 5,
      logger: config.logger || new Logger({ projectId: config.projectId })
    } as RequiredSDKConfig;

    this.logger = this.config.logger;

    this.githubCollector = new GitHubCollector({
      repo: this.config.githubRepo,
      token: this.config.githubToken,
      logger: this.logger
    });

    this.nearCollector = new NEARCollector({
      account: this.config.nearAccount,
      logger: this.logger
    });

    this.aggregator = new MetricsAggregator(this.logger);

    if (config.storage) {
      this.storage = new PostgresStorage({
        connectionConfig: config.storage.config,
        logger: this.logger
      });
    }
  }

  private generateSignature(metrics: ProcessedMetrics): string {
    const data = JSON.stringify({
      timestamp: metrics.timestamp,
      github: metrics.github,
      near: metrics.near,
      score: metrics.score
    });
    return createHash('sha256').update(data).digest('hex');
  }

  async startTracking(): Promise<void> {
    try {
      await this.collectMetrics();
      
      this.collectionInterval = setInterval(
        () => this.collectMetrics().catch(this.handleError.bind(this)),
        this.config.trackingInterval
      );
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async stopTracking(): Promise<void> {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
  }

  private async collectMetrics(): Promise<void> {
    try {
      const [github, near] = await Promise.all([
        this.githubCollector.collectMetrics(),
        this.nearCollector.collectMetrics()
      ]);

      const timestamp = Date.now();
      const aggregated = this.aggregator.aggregate(github, near);

      const processed: ProcessedMetrics = {
        timestamp,
        github: {
          ...github,
          metadata: {
            ...github.metadata,
            source: 'github' as const
          }
        },
        near: {
          ...near,
          metadata: {
            ...near.metadata,
            source: 'near' as const
          }
        },
        score: aggregated,
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
          timestamp,
          metadata: {
            source: 'github' as const,
            validationType: 'data'
          }
        },
        metadata: {
          collectionTimestamp: timestamp,
          source: 'github' as const,
          projectId: this.config.projectId,
          periodStart: timestamp - (24 * 60 * 60 * 1000),
          periodEnd: timestamp
        }
      };

      if (this.storage) {
        const storedMetrics: StoredMetrics = {
          projectId: this.config.projectId,
          timestamp: Date.now(),
          github,
          near,
          processed: {
            ...processed,
            collectionTimestamp: timestamp,
            source: 'github',
            projectId: this.config.projectId,
            periodStart: timestamp - (24 * 60 * 60 * 1000),
            periodEnd: timestamp
          },
          signature: this.generateSignature(processed),
          score: processed.score
        };
        await this.storage.saveMetrics(this.config.projectId, storedMetrics);
      }

      this.emit('metrics:collected', processed);
    } catch (error) {
      const sdkError = error instanceof BaseError ? error : new BaseError(
        'Metrics collection failed',
        ErrorCode.COLLECTION_ERROR,
        { errorDetails: toJSONValue(formatError(error)) }
      );
      this.handleError(sdkError);
      throw sdkError;
    }
  }

  async getMetrics(projectId?: string): Promise<ProcessedMetrics | null> {
    if (!this.storage) {
      throw new BaseError(
        'Storage not configured',
        ErrorCode.COLLECTION_ERROR,
        { projectId: projectId || 'undefined' }
      );
    }
    const metrics = await this.storage.getLatestMetrics(projectId || this.config.projectId);
    
    if (!metrics) return null;

    const processedMetrics: ProcessedMetrics = {
      ...metrics,
      validation: {
        ...metrics.validation,
        errors: metrics.validation.errors.map(e => e.message),
        warnings: metrics.validation.warnings.map(w => w.message)
      },
      metadata: {
        collectionTimestamp: metrics.timestamp,
        source: 'github',
        projectId: metrics.projectId || this.config.projectId,
        periodStart: metrics.timestamp - (24 * 60 * 60 * 1000),
        periodEnd: metrics.timestamp
      }
    };

    return processedMetrics;
  }

  private handleError(error: unknown): void {
    const sdkError = error instanceof BaseError ? error : new BaseError(
      'SDK operation failed',
      ErrorCode.COLLECTION_ERROR,
      { errorDetails: toJSONValue(formatError(error)) }
    );
    
    this.emit('error', sdkError);
  }

  async cleanup(): Promise<void> {
    await this.stopTracking();
    if (this.storage) {
      await this.storage.cleanup();
    }
  }

  private validateConfig(config: SDKConfig): void {
    const required = [
      'projectId',
      'nearAccount',
      'githubRepo',
      'githubToken'
    ];

    const missing = required.filter(key => !config[key as keyof SDKConfig]);
    if (missing.length > 0) {
      throw new BaseError(
        `Missing required configuration: ${missing.join(', ')}`,
        ErrorCode.VALIDATION_ERROR
      );
    }
  }
}
