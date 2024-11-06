import { NEARProtocolRewardsSDK } from '../sdk';
import { Logger } from '../utils/logger';
import { Telemetry, TelemetryEvent } from '../utils/telemetry';
import { 
  DashboardMetrics, 
  InternalMetrics,
  TimeRange,
  ActivityItem,
  IntegrationStatus
} from '../types/dashboard';
import { ProcessedMetrics } from '../types/metrics';
import { formatError } from '../utils/format-error';
import { SDKConfig } from '../types/sdk';
import { ValidationError } from '../types/validation';
import { ConsoleLogger } from '../utils/logger';

export class MetricsDashboardService {
  private readonly sdk: NEARProtocolRewardsSDK;
  private readonly telemetry: Telemetry;
  private readonly logger: Logger;
  private updateTimer?: NodeJS.Timeout;
  private readonly updateInterval = 5 * 60 * 1000; // 5 minutes
  private events: TelemetryEvent[] = [];
  
  constructor(config: SDKConfig) {
    this.sdk = new NEARProtocolRewardsSDK(config);
    this.logger = new ConsoleLogger('info');
    this.telemetry = new Telemetry(
      this.logger,
      config.projectId,
      process.env.NODE_ENV || 'production'
    );
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.sdk.on('metrics:collected', (metrics: ProcessedMetrics) => {
      this.telemetry.trackMetricsCollection(metrics);
    });

    this.sdk.on('reward:calculated', (reward) => {
      this.telemetry.trackRewardCalculation(reward);
    });

    this.sdk.on('error', (error) => {
      this.logger.error('SDK error occurred', {
        error: formatError(error),
        context: { service: 'dashboard' }
      });
    });
  }

  // Public Dashboard Interface
  async getPublicMetrics(): Promise<DashboardMetrics> {
    const metrics = await this.sdk.getMetrics();
    
    if (!metrics) {
      throw new Error('Failed to fetch metrics');
    }

    return {
      github: {
        commits: {
          count: metrics.github.commits.count,
          frequency: metrics.github.commits.frequency,
          authors: metrics.github.commits.authors,
        },
        pullRequests: {
          merged: metrics.github.pullRequests.merged,
          open: metrics.github.pullRequests.open,
          authors: metrics.github.pullRequests.authors,
        },
        issues: {
          open: metrics.github.issues.open,
          closed: metrics.github.issues.closed,
          participants: metrics.github.issues.participants,
          engagement: metrics.github.issues.engagement,
        },
        metadata: metrics.github.metadata,
      },
      near: {
          transactions: {
              count: metrics.near.transactions.count,
              volume: metrics.near.transactions.volume,
              uniqueUsers: metrics.near.transactions.uniqueUsers,
          },
          contract: {
              calls: metrics.near.contract.calls,
              uniqueCallers: metrics.near.contract.uniqueCallers,
          },
          metadata: {
              blockHeight: 0,
              priceData: {
                  usd: 0,
                  timestamp: 0
              },
              collectionTimestamp: 0,
              source: 'near',
              projectId: ''
          }
      },
      validation: metrics.validation
    };
  }

  // Internal Monitoring Interface
  async getInternalMetrics(timeRange: TimeRange): Promise<InternalMetrics> {
    // Use local events storage instead of telemetry.getEvents
    const filteredEvents = this.events.filter(event => 
      event.timestamp >= timeRange.start.getTime() &&
      event.timestamp <= timeRange.end.getTime()
    );
    
    return {
      totalInitializations: this.countEventType(filteredEvents, 'sdk_init'),
      metricsCollected: this.countEventType(filteredEvents, 'metrics_collected'),
      rewardsCalculated: this.countEventType(filteredEvents, 'reward_calculated'),
      errors: this.countEventType(filteredEvents, 'error'),
      averageScore: this.calculateAverageScore(filteredEvents),
      errorBreakdown: this.getErrorBreakdown(filteredEvents)
    };
  }

  // Activity Feed
  async getActivityFeed(): Promise<ActivityItem[]> {
    const metrics = await this.getPublicMetrics();
    
    const activities: ActivityItem[] = [
      ...metrics.github.commits.authors.map((author: string, index: number) => ({
        id: `commit-${index}`,
        type: 'commit' as const,
        title: `New commit by ${author}`,
        timestamp: new Date().toISOString(),
        details: 'Code contribution to repository',
      })),
      
      ...[...Array(Math.min(5, metrics.near.transactions.count))].map((_, index: number) => ({
        id: `tx-${index}`,
        type: 'transaction' as const,
        title: 'NEAR Transaction',
        timestamp: new Date().toISOString(),
        details: 'Contract interaction',
      })),
    ];

    return activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  // Integration Status
  async getIntegrationStatus(): Promise<IntegrationStatus[]> {
    const metrics = await this.getPublicMetrics();
    
    return [
      {
        name: 'GitHub',
        status: metrics.validation.errors.some((e: ValidationError) => e.code.startsWith('GITHUB')) 
          ? 'error' 
          : 'connected',
        lastSync: new Date().toISOString(),
        error: metrics.validation.errors
          .find((e: ValidationError) => e.code.startsWith('GITHUB'))
          ?.message,
      },
      {
        name: 'NEAR Protocol',
        status: metrics.validation.errors.some((e: ValidationError) => e.code.startsWith('NEAR')) 
          ? 'error' 
          : 'connected',
        lastSync: new Date().toISOString(),
        error: metrics.validation.errors
          .find((e: ValidationError) => e.code.startsWith('NEAR'))
          ?.message,
      },
    ];
  }

  // Lifecycle Management
  async initialize(): Promise<void> {
    await this.sdk.startTracking();
    this.startPeriodicUpdates();
  }

  async cleanup(): Promise<void> {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    await this.sdk.cleanup();
  }

  private startPeriodicUpdates(): void {
    this.updateTimer = setInterval(async () => {
      try {
        await this.refreshMetrics();
      } catch (error) {
        this.logger.error('Failed to refresh metrics', {
          error: formatError(error),
          context: { service: 'dashboard' }
        });
      }
    }, this.updateInterval);
  }

  private async refreshMetrics(): Promise<void> {
    const metrics = await this.sdk.getMetrics();
    if (metrics) {
      this.telemetry.trackMetricsCollection(metrics);
    }
  }

  private countEventType(events: any[], type: string): number {
    return events.filter(event => event.type === type).length;
  }

  private calculateAverageScore(events: any[]): number {
    const rewardEvents = events.filter(event => event.type === 'reward_calculated');
    if (rewardEvents.length === 0) return 0;
    
    return rewardEvents.reduce((acc, event) => 
      acc + (event.data.score?.total || 0), 0) / rewardEvents.length;
  }

  private getErrorBreakdown(events: any[]): Record<string, number> {
    return events
      .filter(event => event.type === 'error')
      .reduce((acc, event) => {
        const code = event.data.errorCode || 'UNKNOWN';
        acc[code] = (acc[code] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
  }

  // Add method to store events
  private storeEvent(event: TelemetryEvent): void {
    this.events.push(event);
    // Optional: Implement event retention policy
    this.cleanupOldEvents();
  }

  private cleanupOldEvents(): void {
    const retentionPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days
    const cutoffTime = Date.now() - retentionPeriod;
    this.events = this.events.filter(event => event.timestamp >= cutoffTime);
  }
} 