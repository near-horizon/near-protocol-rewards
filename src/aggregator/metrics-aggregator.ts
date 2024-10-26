import { GitHubMetrics, NEARMetrics } from '../types';
import { Logger } from '../utils/logger';
import { BaseError, ErrorCode } from '../utils/errors';

interface MetricsWeights {
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
  weights?: Partial<MetricsWeights>;
}

export class MetricsAggregator {
  private readonly logger: Logger;
  private readonly weights: MetricsWeights;

  constructor(config: AggregatorConfig) {
    this.logger = config.logger;
    // Set default weights if not provided
    this.weights = {
      github: {
        commits: config.weights?.github?.commits ?? 0.4,
        pullRequests: config.weights?.github?.pullRequests ?? 0.4,
        issues: config.weights?.github?.issues ?? 0.2
      },
      near: {
        transactions: config.weights?.near?.transactions ?? 0.4,
        contractCalls: config.weights?.near?.contractCalls ?? 0.4,
        uniqueUsers: config.weights?.near?.uniqueUsers ?? 0.2
      }
    };
  }

  aggregateMetrics(github: GitHubMetrics, near: NEARMetrics): {
    score: number;
    breakdown: {
      github: number;
      near: number;
    };
  } {
    try {
      const githubScore = this.calculateGitHubScore(github);
      const nearScore = this.calculateNEARScore(near);

      return {
        score: Math.round((githubScore + nearScore) / 2),
        breakdown: {
          github: githubScore,
          near: nearScore
        }
      };
    } catch (error) {
      this.logger.error('Failed to aggregate metrics', { error });
      throw new BaseError(
        'Metrics aggregation failed',
        ErrorCode.COLLECTION_ERROR,
        { error }
      );
    }
  }

  private calculateGitHubScore(metrics: GitHubMetrics): number {
    // Calculate individual scores
    const commitScore = Math.min(100, (metrics.commits.count / 100) * 100);
    const prScore = Math.min(100, (metrics.pullRequests.merged / 20) * 100);
    const issueScore = Math.min(100, (metrics.issues.closed / 30) * 100);

    // Apply weights and calculate total
    return Math.round(
      (commitScore * this.weights.github.commits) +
      (prScore * this.weights.github.pullRequests) +
      (issueScore * this.weights.github.issues)
    );
  }

  private calculateNEARScore(metrics: NEARMetrics): number {
    // Calculate individual scores
    const txScore = Math.min(100, (metrics.transactions.count / 1000) * 100);
    const contractScore = Math.min(100, (metrics.contract.calls / 500) * 100);
    const userScore = Math.min(100, (metrics.transactions.uniqueUsers.length / 100) * 100);

    // Apply weights and calculate total
    return Math.round(
      (txScore * this.weights.near.transactions) +
      (contractScore * this.weights.near.contractCalls) +
      (userScore * this.weights.near.uniqueUsers)
    );
  }

  // Helper method to get current weights configuration
  getWeights(): MetricsWeights {
    return { ...this.weights };
  }
}
