import { NEARProtocolRewardsSDK } from '../sdk';
import { SDKConfig } from '../types';
import { Logger } from '../utils/logger';
import { formatError } from '../utils/format-error';

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
      open: number;
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
  private readonly sdk: NEARProtocolRewardsSDK;
  private readonly logger: Logger;
  private updateTimer?: NodeJS.Timeout;
  private readonly updateInterval = 5 * 60 * 1000; // 5 minutes

  constructor(config: SDKConfig) {
    this.sdk = new NEARProtocolRewardsSDK(config);
    this.logger = new Logger({ projectId: config.projectId });
    this.setupEventListeners();
  }

  setupEventListeners(): void {
    // Implementation will be added later
    this.sdk.on('error', (error) => {
      this.logger.error('SDK error occurred', {
        error: formatError(error),
        context: { service: 'dashboard' }
      });
    });
  }

  private async refreshMetrics(): Promise<void> {
    try {
      // Implementation
    } catch (error) {
      this.logger.error('Failed to refresh metrics', {
        error: formatError(error),
        context: { service: 'dashboard' }
      });
    }
  }

  async initialize(): Promise<void> {
    await this.sdk.startTracking();
  }

  async getMetrics(): Promise<DashboardMetrics> {
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
          count: metrics.github.pullRequests.open + metrics.github.pullRequests.merged,
          merged: metrics.github.pullRequests.merged,
        },
        issues: {
          open: metrics.github.issues.open,
          closed: metrics.github.issues.closed,
        },
      },
      near: {
        transactions: {
          count: metrics.near.transactions.count,
          volume: parseFloat(metrics.near.transactions.volume),
        },
        contracts: {
          calls: metrics.near.contract.calls,
          unique: metrics.near.contract.uniqueCallers.length,
        },
      },
      validation: {
        errors: metrics.validation.errors,
        warnings: metrics.validation.warnings,
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
        timestamp: new Date().toISOString(),
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
    this.updateTimer = setInterval(() => {
      void this.refreshMetrics();
    }, this.updateInterval);
  }

  stopAutoRefresh(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }
  }
}
