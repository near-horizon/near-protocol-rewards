import { Logger } from './logger';
import { ProcessedMetrics, RewardCalculation } from '../types/metrics';

export type TelemetryEventType = 
  | 'sdk_init' 
  | 'metrics_collected' 
  | 'reward_calculated' 
  | 'error' 
  | 'validation_failed';

export interface TelemetryEvent {
  type: TelemetryEventType;
  projectId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export class Telemetry {
  constructor(
    private readonly logger: Logger,
    private readonly projectId: string,
    private readonly environment: string
  ) {}

  trackSDKInitialization(config: Record<string, unknown>): void {
    const eventData: Record<string, unknown> = {
      nodeVersion: process.version,
      sdkVersion: process.env.npm_package_version,
      environment: this.environment,
      ...config
    };

    this.track('sdk_init', eventData);
  }

  trackMetricsCollection(metrics: ProcessedMetrics): void {
    const eventData: Record<string, unknown> = {
      githubMetrics: {
        commitCount: metrics.github.commits.count,
        prCount: metrics.github.pullRequests.merged,
        authorCount: metrics.github.commits.authors.length
      },
      nearMetrics: {
        txCount: metrics.near.transactions.count,
        userCount: metrics.near.transactions.uniqueUsers.length
      }
    };

    this.track('metrics_collected', eventData);
  }

  trackRewardCalculation(reward: RewardCalculation): void {
    const eventData: Record<string, unknown> = {
      score: reward.score,
      usdAmount: reward.rewards.usdAmount,
      timestamp: reward.metadata.timestamp
    };

    this.track('reward_calculated', eventData);
  }

  trackError(error: Error & { code?: string }): void {
    const eventData: Record<string, unknown> = {
      errorCode: error.code || 'UNKNOWN_ERROR',
      message: error.message,
      stack: error.stack
    };

    this.track('error', eventData);
  }

  private track(type: TelemetryEventType, data: Record<string, unknown>): void {
    const event: Record<string, unknown> = {
      type,
      projectId: this.projectId,
      timestamp: Date.now(),
      data
    };

    this.logger.info('Telemetry event', event);
  }
} 