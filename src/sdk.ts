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
import { MetricsCalculator } from './calculator/metrics-calculator';
import { PostgresStorage } from './storage/postgres';
import { ConsoleLogger, defaultLogger } from './utils/logger';
import { 
  GitHubMetrics, 
  NEARMetrics,
  ProcessedMetrics,
  StoredMetrics,
  RewardCalculation,
  Score
} from './types/metrics';
import { ValidationResult } from './types/validation';
import { BaseError, ErrorCode } from './utils/errors';
import { createHash } from 'crypto';
import { formatError } from './utils/format-error';
import { SDKConfig, RequiredSDKConfig } from './types/sdk';
import { toJSONValue } from './types/json';
import { RateLimiter } from './utils/rate-limiter';
import { Telemetry } from './utils/telemetry';

export class NEARProtocolRewardsSDK extends EventEmitter {
  private readonly config: RequiredSDKConfig;
  private readonly githubCollector: GitHubCollector;
  private readonly nearCollector: NEARCollector;
  private readonly calculator: MetricsCalculator;
  private readonly storage?: PostgresStorage;
  private readonly logger: ConsoleLogger;
  private readonly rateLimiter: RateLimiter;
  private trackingInterval?: NodeJS.Timeout;
  private isTracking: boolean = false;
  private readonly telemetry: Telemetry;

  static readonly VERSION = '0.1.2';

  constructor(config: SDKConfig) {
    super();
    this.validateConfig(config);
    
    // Initialize config with defaults
    this.config = {
      ...config,
      trackingInterval: config.trackingInterval || 6 * 60 * 60 * 1000,
      maxRequestsPerSecond: config.maxRequestsPerSecond || 5,
      logger: config.logger || defaultLogger,
      minRewardUsd: config.minRewardUsd || 250,
      maxRewardUsd: config.maxRewardUsd || 10000
    } as RequiredSDKConfig;

    this.logger = this.config.logger;
    
    // Initialize storage if configured
    if (config.storage?.type === 'postgres') {
      this.storage = new PostgresStorage(config.storage.config, this.logger);
    }

    // Initialize rate limiter
    this.rateLimiter = new RateLimiter({
      maxRequests: this.config.maxRequestsPerSecond,
      timeWindowMs: 1000,
      retryAfterMs: 1000
    });
    
    // Initialize collectors
    this.githubCollector = new GitHubCollector({
      token: this.config.githubToken,
      repo: this.config.githubRepo,
      logger: this.logger
    });
    
    this.nearCollector = new NEARCollector({
      account: this.config.nearAccount,
      projectId: this.config.projectId,
      logger: this.logger
    });

    // Initialize calculator with storage
    this.calculator = new MetricsCalculator({
      logger: this.logger,
      weights: {
        github: { commits: 0.4, pullRequests: 0.3, issues: 0.3 },
        near: { transactions: 0.4, contractCalls: 0.3, uniqueUsers: 0.3 }
      }
    }, this.storage || new PostgresStorage(config.storage?.config || {}, this.logger));

    this.telemetry = new Telemetry(
      this.logger,
      config.projectId,
      process.env.NODE_ENV || 'production'
    );
    
    this.telemetry.trackSDKInitialization({
      nearAccount: config.nearAccount,
      githubRepo: config.githubRepo
    });

    // Add telemetry to existing event handlers
    this.on('metrics:collected', (metrics) => {
      this.telemetry.trackMetricsCollection(metrics);
    });

    this.on('reward:calculated', (reward) => {
      this.telemetry.trackRewardCalculation(reward);
    });

    this.on('error', (error) => {
      this.telemetry.trackError(error);
    });
  }

  async startTracking(): Promise<void> {
    if (this.isTracking) {
      return;
    }

    this.isTracking = true;
    await this.collectMetrics(); // Initial collection

    this.trackingInterval = setInterval(
      () => this.collectMetrics(),
      this.config.trackingInterval
    );

    this.logger.info('Started metrics tracking');
  }

  async stopTracking(): Promise<void> {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = undefined;
    }
    this.isTracking = false;
    this.logger.info('Stopped metrics tracking');
  }

  async getMetrics(projectId?: string): Promise<ProcessedMetrics | null> {
    try {
      const [githubMetrics, nearMetrics] = await Promise.all([
        this.githubCollector.collectMetrics(),
        this.nearCollector.collectMetrics()
      ]);

      const timestamp = Date.now();
      
      // Create a properly typed metrics object
      const metrics: ProcessedMetrics = {
        timestamp,
        collectionTimestamp: timestamp,
        github: githubMetrics,
        near: nearMetrics,
        projectId: projectId || this.config.projectId,
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
          warnings: [],
          timestamp,
          metadata: {
            source: 'github',
            validationType: 'data'
          }
        },
        metadata: {
          collectionTimestamp: timestamp,
          source: 'github', // Use github as default source
          projectId: projectId || this.config.projectId,
          periodStart: timestamp - (24 * 60 * 60 * 1000),
          periodEnd: timestamp
        },
        periodStart: timestamp - (24 * 60 * 60 * 1000),
        periodEnd: timestamp
      };

      return this.processMetrics(metrics);
    } catch (error) {
      this.handleError(error);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const [githubHealth, nearHealth] = await Promise.all([
        this.githubCollector.testConnection(),
        this.nearCollector.testConnection()
      ]);

      return githubHealth && nearHealth;
    } catch (error) {
      this.logger.error('Health check failed', { error });
      return false;
    }
  }

  private async collectMetrics(): Promise<void> {
    try {
      const metrics = await this.getMetrics();
      if (metrics) {
        this.emit('metrics:collected', metrics);
        
        if (this.storage) {
          // Transform ProcessedMetrics to StoredMetrics before saving
          const storedMetrics: StoredMetrics = {
            projectId: metrics.projectId,
            timestamp: metrics.timestamp,
            github: metrics.github,
            near: metrics.near,
            processed: metrics,
            validation: metrics.validation,
            signature: this.generateSignature(metrics),
            score: metrics.score
          };
          
          await this.storage.saveMetrics(storedMetrics);
        }
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  private async processMetrics(rawMetrics: ProcessedMetrics): Promise<ProcessedMetrics> {
    try {
      const reward = await this.calculator.calculateMetrics(
        rawMetrics.github,
        rawMetrics.near
      );

      const score: Score = {
        total: reward.total,
        breakdown: {
          github: reward.github.total,
          near: reward.near.total
        }
      };

      return {
        ...rawMetrics,
        score,
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
          collectionTimestamp: Date.now(),
          source: 'github',
          projectId: this.config.projectId,
          periodStart: rawMetrics.periodStart,
          periodEnd: rawMetrics.periodEnd
        }
      };
    } catch (error) {
      this.handleError(error);
      throw error;
    }
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

  private handleError(error: unknown): void {
    const sdkError = error instanceof BaseError ? error : new BaseError(
      'SDK operation failed',
      ErrorCode.SDK_ERROR,
      { errorDetails: toJSONValue(formatError(error)) }
    );
    
    this.emit('error', sdkError);
  }

  on(event: 'metrics:collected', listener: (metrics: ProcessedMetrics) => void): this;
  on(event: 'reward:calculated', listener: (reward: RewardCalculation) => void): this;
  on(event: 'error', listener: (error: BaseError) => void): this;
  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  // Add signature generation method
  private generateSignature(metrics: ProcessedMetrics): string {
    const data = JSON.stringify({
      timestamp: metrics.timestamp,
      github: metrics.github,
      near: metrics.near,
      score: metrics.score
    });
    return createHash('sha256').update(data).digest('hex');
  }
}
