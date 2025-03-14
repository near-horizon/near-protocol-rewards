/**
 * GitHub Rewards SDK
 *
 * A simplified rewards system that tracks GitHub development activity
 * and calculates rewards based on contribution metrics.
 */

import { EventEmitter } from "events";
import { GitHubCollector } from "./collectors/github";
import { NearWalletCollector } from "./collectors/near-wallet-collector";
import { ProcessedMetrics, WalletActivity } from "./types/metrics";
import { SDKConfig } from "./types/sdk";
import { BaseError, ErrorCode } from "./types/errors";
import { ConsoleLogger } from "./utils/logger";
import { RateLimiter } from "./utils/rate-limiter";
import { validateConfig } from "./utils/config-validator";
import { GitHubValidator } from "./validators/github";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

export class GitHubRewardsSDK extends EventEmitter {
  private readonly collector: GitHubCollector;
  private readonly walletCollector?: NearWalletCollector;
  private readonly logger: ConsoleLogger;
  private readonly validator: GitHubValidator;
  private readonly config: SDKConfig;
  private isTracking: boolean = false;

  constructor(config: SDKConfig) {
    super();
    const validationResult = validateConfig(config);
    if (!validationResult.isValid) {
      const errorMessage =
        validationResult.errors[0]?.message || "Invalid configuration";
      throw new BaseError(errorMessage, ErrorCode.INVALID_CONFIG, {
        errors: validationResult.errors,
      });
    }

    this.config = config;
    this.logger = config.logger || new ConsoleLogger();

    const rateLimiter = new RateLimiter({
      maxRequestsPerSecond: config.maxRequestsPerSecond || 5,
    });

    this.validator = new GitHubValidator({
      logger: this.logger,
      maxCommitsPerDay: 15,
      minAuthors: 1,
      minReviewPrRatio: 0.5,
    });

    this.collector = new GitHubCollector({
      token: config.githubToken,
      repo: config.githubRepo,
      logger: this.logger,
      rateLimiter,
    });

    const configPath = join(process.cwd(), '.near-rewards-config.json');
    if (existsSync(configPath)) {
      try {
        const walletConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
        if (walletConfig.walletId) {
          this.walletCollector = new NearWalletCollector(
            walletConfig.walletId,
            walletConfig.networkId || 'mainnet'
          );
        }
      } catch (error) {
        this.logger.warn('Failed to initialize wallet collector', { error });
      }
    }
  }

  async startTracking(): Promise<void> {
    if (this.isTracking) {
      return;
    }

    try {
      await this.collector.testConnection();
      this.isTracking = true;
      this.emit("tracking:started");
    } catch (error) {
      this.logger.error("Failed to start tracking", { error });
      throw error;
    }
  }

  async stopTracking(): Promise<void> {
    if (!this.isTracking) {
      return;
    }

    this.isTracking = false;
    this.emit("tracking:stopped");
  }

  async getMetrics(): Promise<ProcessedMetrics | null> {
    try {
      const metrics = await this.collector.collectMetrics();
      const validation = this.validator.validate(metrics);

      let walletActivities: WalletActivity[] = [];
      if (this.walletCollector) {
        try {
          walletActivities = await this.walletCollector.collectActivities();
        } catch (error) {
          this.logger.warn('Failed to collect wallet activities', { error });
        }
      }

      const processed: ProcessedMetrics = {
        github: metrics,
        near: walletActivities.length > 0 ? {
          activities: walletActivities,
          timestamp: Date.now()
        } : undefined,
        score: {
          total: 0,
          breakdown: {
            commits: 0,
            pullRequests: 0,
            reviews: 0,
            issues: 0,
          },
        },
        timestamp: Date.now(),
        collectionTimestamp: metrics.metadata.collectionTimestamp,
        validation,
        metadata: {
          source: walletActivities.length > 0 ? "github+near" : "github",
          projectId: metrics.metadata.projectId,
          collectionTimestamp: metrics.metadata.collectionTimestamp,
          periodStart: Date.now() - 7 * 24 * 60 * 60 * 1000, // 1 week ago
          periodEnd: Date.now(),
        },
        periodStart: Date.now() - 7 * 24 * 60 * 60 * 1000,
        periodEnd: Date.now(),
      };

      this.emit("metrics:collected", processed);
      return processed;
    } catch (error) {
      this.logger.error("Failed to collect metrics", { error });
      this.emit("error", error);
      return null;
    }
  }
}

export { SDKConfig, SDKEvents, RewardCalculation } from "./types/sdk";
export { GitHubMetrics, ProcessedMetrics } from "./types/metrics";
export { BaseError, ErrorCode } from "./types/errors";
