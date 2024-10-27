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
import { ProcessedMetrics, StoredMetrics } from './types';
import { BaseError, ErrorCode } from './utils/errors';
import { createHash } from 'crypto';
import { formatError } from './utils/format-error'; 

export interface SDKConfig {
  projectId: string;
  nearAccount: string;
  githubRepo: string;
  githubToken: string;
  storage?: {
    type: 'postgres';
    config: {
      host: string;
      port: number;
      database: string;
      user: string;
      password: string;
    };
  };
  trackingInterval?: number;
}

export class NEARProtocolRewardsSDK extends EventEmitter {
  private collectors!: {
    github: GitHubCollector;
    near: NEARCollector;
  };
  private aggregator!: MetricsAggregator;
  private storage?: PostgresStorage;
  private logger!: Logger;
  private projectId!: string;
  private collectionInterval?: NodeJS.Timeout;

  constructor(config: SDKConfig) {
    super();
    this.initializeSDK(config);
  }

  private initializeSDK(config: SDKConfig): void {
    this.projectId = config.projectId;
    this.logger = new Logger({ projectId: config.projectId });
    
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

    this.aggregator = new MetricsAggregator({ logger: this.logger });

    if (config.storage?.type === 'postgres') {
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

      const timestamp = Date.now();
      const aggregated = this.aggregator.aggregate(github, near);

      const processed: ProcessedMetrics = {
        timestamp,
        github,
        near,
        score: aggregated,
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
        collectionTimestamp: timestamp,
        source: 'github',
        projectId: this.projectId,
        periodStart: timestamp - (24 * 60 * 60 * 1000),
        periodEnd: timestamp
      };

      if (this.storage) {
        const storedMetrics: StoredMetrics = {
          projectId: this.projectId,
          timestamp: Date.now(),
          github,
          near,
          processed,
          signature: this.generateSignature(processed),
          score: processed.score
        };
        await this.storage.saveMetrics(this.projectId, storedMetrics);
      }

      this.emit('metrics:collected', processed);
    } catch (error) {
      const sdkError = error instanceof BaseError ? error : new BaseError(
        'Metrics collection failed',
        ErrorCode.COLLECTION_ERROR,
        { errorDetails: formatError(error) }
      );
      this.handleError(sdkError);
      throw sdkError;
    }
  }

  async getMetrics(projectId?: string): Promise<ProcessedMetrics | null> {
    if (!this.storage) {
      throw new BaseError(
        'Storage not configured',
        ErrorCode.INTERNAL_ERROR,
        { projectId: projectId || 'undefined' }
      );
    }
    return this.storage.getLatestMetrics(projectId || this.projectId);
  }

  private handleError(error: unknown): void {
    const sdkError = error instanceof BaseError ? error : new BaseError(
      'SDK operation failed',
      ErrorCode.INTERNAL_ERROR,
      { errorDetails: formatError(error) }
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
