import { NEARProtocolRewardsSDK, ProcessedMetrics } from '../sdk';
import { SDKConfig } from '../types';

export interface DashboardMetrics {
  github: {
    commits: {
      count: number;
      frequency: number;
      authors: string[];
    };
    pullRequests: {
      count: number;
      merged: number;
    };
    issues: {
      opened: number;
      closed: number;
    };
  };
  near: {
    transactions: {
      count: number;
      volume: number;
    };
    contracts: {
      calls: number;
      unique: number;
    };
  };
  validation: {
    errors: Array<{ code: string; message: string }>;
    warnings: Array<{ code: string; message: string }>;
  };
}

export class DashboardService {
  private sdk: NEARProtocolRewardsSDK;
  private metrics: ProcessedMetrics | null = null;
  private readonly updateInterval = 5 * 60 * 1000; // 5 minutes
  private updateTimer: NodeJS.Timer;

  constructor(config: SDKConfig) {
    this.sdk = new NEARProtocolRewardsSDK(config);
    
    // Subscribe to real-time metrics updates
    this.sdk.on('metrics:collected', (metrics: ProcessedMetrics) => {
      this.metrics = metrics;
    });
    
    this.sdk.on('error', (error) => {
      console.error('SDK Error:', error);
    });
  }

  async initialize(): Promise<void> {
    await this.sdk.startTracking();
  }

  async getMetrics(): Promise<DashboardMetrics> {
    if (!this.metrics) {
      this.metrics = await this.sdk.getMetrics();
    }

    if (!this.metrics) {
      throw new Error('Failed to fetch metrics');
    }

    return {
      github: {
        commits: {
          count: this.metrics.github.commits.count,
          frequency: this.metrics.github.commits.frequency,
          authors: this.metrics.github.commits.authors,
        },
        pullRequests: {
          count: this.metrics.github.pullRequests.total,
          merged: this.metrics.github.pullRequests.merged,
        },
        issues: {
          opened: this.metrics.github.issues.opened,
          closed: this.metrics.github.issues.closed,
        },
      },
      near: {
        transactions: {
          count: this.metrics.near.transactions.count,
          volume: this.metrics.near.transactions.volume,
        },
        contracts: {
          calls: this.metrics.near.contractCalls.count,
          unique: this.metrics.near.contractCalls.uniqueContracts,
        },
      },
      validation: {
        errors: this.metrics.validation.errors,
        warnings: this.metrics.validation.warnings,
      },
    };
  }

  async getActivityFeed(): Promise<Array<{
    id: string;
    type: 'commit' | 'transaction' | 'reward';
    title: string;
    timestamp: string;
    details: string;
  }>> {
    const metrics = await this.getMetrics();
    
    // Combine and sort different types of activities
    const activities = [
      // Map recent commits
      ...metrics.github.commits.authors.map((author, index) => ({
        id: `commit-${index}`,
        type: 'commit' as const,
        title: `New commit by ${author}`,
        timestamp: new Date().toISOString(), // You'll want to get actual timestamps
        details: 'Code contribution to repository',
      })),
      
      // Map recent transactions
      ...[...Array(Math.min(5, metrics.near.transactions.count))].map((_, index) => ({
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

  async getIntegrationStatus(): Promise<Array<{
    name: string;
    status: 'connected' | 'pending' | 'error';
    lastSync?: string;
    error?: string;
  }>> {
    const metrics = await this.getMetrics();
    
    return [
      {
        name: 'GitHub',
        status: metrics.validation.errors.some(e => e.code.startsWith('GITHUB')) 
          ? 'error' 
          : 'connected',
        lastSync: new Date().toISOString(),
        error: metrics.validation.errors
          .find(e => e.code.startsWith('GITHUB'))
          ?.message,
      },
      {
        name: 'NEAR Protocol',
        status: metrics.validation.errors.some(e => e.code.startsWith('NEAR')) 
          ? 'error' 
          : 'connected',
        lastSync: new Date().toISOString(),
        error: metrics.validation.errors
          .find(e => e.code.startsWith('NEAR'))
          ?.message,
      },
    ];
  }

  startAutoRefresh(): void {
    this.updateTimer = setInterval(async () => {
      await this.refreshMetrics();
    }, this.updateInterval);
  }

  stopAutoRefresh(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
  }
}
