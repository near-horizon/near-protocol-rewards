import { GitHubMetrics, NEARMetrics, ProcessedMetrics } from '../types';
import { Logger } from '../utils/logger';
import { BaseError, ErrorCode } from '../utils/errors';

interface WeightConfig {
  github: {
    commits: number;
    pullRequests: number;
    issues: number;
  };
  near: {
    transactions: number;
    contractCalls: number;
    uniqueUsers: number;
  };
}

interface AggregatorConfig {
  logger: Logger;
  weights?: Partial<WeightConfig>;
}

export class MetricsAggregator {
  private readonly logger: Logger;
  private readonly weights: WeightConfig;

  constructor(config: AggregatorConfig) {
    this.logger = config.logger;
    // Initialize weights with default values
    this.weights = {
      github: {
        commits: 0.4,
        pullRequests: 0.4,
        issues: 0.2,
        ...config.weights?.github
      },
      near: {
        transactions: 0.4,
        contractCalls: 0.4,
        uniqueUsers: 0.2,
        ...config.weights?.near
      }
    };
  }

  aggregate(github: GitHubMetrics, near: NEARMetrics): ProcessedMetrics['score'] {
    try {
      const githubScore = this.calculateGitHubScore(github);
      const nearScore = this.calculateNEARScore(near);
      
      return {
        total: (githubScore + nearScore) / 2,
        breakdown: {
          github: githubScore,
          near: nearScore
        }
      };
    } catch (error) {
      this.logger.error('Failed to aggregate metrics', { error });
      throw new BaseError(
        'Metrics aggregation failed',
        ErrorCode.AGGREGATION_ERROR,
        { error }
      );
    }
  }

  private calculateGitHubScore(metrics: GitHubMetrics): number {
    const { commits, pullRequests, issues } = metrics;
    
    // Handle potential division by zero
    const prRatio = pullRequests.open + pullRequests.merged > 0
      ? pullRequests.merged / (pullRequests.open + pullRequests.merged)
      : 0;

    const issueRatio = issues.open + issues.closed > 0
      ? issues.closed / (issues.open + issues.closed)
      : 0;

    // Use the defined weights directly
    return (
      (commits.count * this.weights.github.commits) +
      (prRatio * this.weights.github.pullRequests) +
      (issueRatio * this.weights.github.issues)
    ) / 3;
  }

  private calculateNEARScore(metrics: NEARMetrics): number {
    const { transactions, contract } = metrics;
    
    // Ensure volume is a number and handle potential NaN
    const volumeScore = Number(transactions.volume) || 0;
    
    // Use the defined weights directly
    return (
      (volumeScore * this.weights.near.transactions) +
      (contract.calls * this.weights.near.contractCalls) +
      (transactions.uniqueUsers.length * this.weights.near.uniqueUsers)
    ) / 3;
  }
}
