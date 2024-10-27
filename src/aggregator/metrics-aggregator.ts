import { GitHubMetrics, NEARMetrics } from '../types';
import { Logger } from '../utils/logger';

// Define weight interfaces
interface GitHubWeights {
  commits: number;
  pullRequests: number;
  issues: number;
}

interface NEARWeights {
  transactions: number;
  contractCalls: number;
  uniqueUsers: number;
}

interface MetricsAggregatorConfig {
  logger: Logger;
  weights?: {
    github?: Partial<GitHubWeights>;
    near?: Partial<NEARWeights>;
  };
}

export class MetricsAggregator {
  private readonly logger: Logger;
  private readonly weights: {
    github: GitHubWeights;
    near: NEARWeights;
  };

  constructor(config: MetricsAggregatorConfig) {
    this.logger = config.logger;
    this.weights = {
      github: {
        commits: config.weights?.github?.commits ?? 0.4,
        pullRequests: config.weights?.github?.pullRequests ?? 0.3,
        issues: config.weights?.github?.issues ?? 0.3
      },
      near: {
        transactions: config.weights?.near?.transactions ?? 0.4,
        contractCalls: config.weights?.near?.contractCalls ?? 0.3,
        uniqueUsers: config.weights?.near?.uniqueUsers ?? 0.3
      }
    };

    this.logger.info('Initialized MetricsAggregator with weights', { weights: this.weights });
  }

  aggregateMetrics(
    github: GitHubMetrics,
    near: NEARMetrics
  ): { github: { total: number }; near: { total: number }; total: number } {
    try {
      const githubScore = this.calculateGitHubScore(github);
      const nearScore = this.calculateNEARScore(near);
      
      return {
        github: { total: githubScore },
        near: { total: nearScore },
        total: Math.round((githubScore + nearScore) / 2)
      };
    } catch (error) {
      this.logger.error('Failed to aggregate metrics', { error });
      throw error;
    }
  }

  private calculateGitHubScore(metrics: GitHubMetrics): number {
    const commitScore = Math.min(100, (metrics.commits.count / 100) * 100);
    const prScore = Math.min(100, (metrics.pullRequests.merged / 20) * 100);
    const issueScore = Math.min(100, (metrics.issues.closed / 30) * 100);

    return Math.round(
      (commitScore * this.weights.github.commits) +
      (prScore * this.weights.github.pullRequests) +
      (issueScore * this.weights.github.issues)
    );
  }

  private calculateNEARScore(metrics: NEARMetrics): number {
    const txScore = Math.min(100, (metrics.transactions.count / 1000) * 100);
    const contractScore = Math.min(100, (metrics.contract.calls / 500) * 100);
    const userScore = Math.min(100, (metrics.transactions.uniqueUsers.length / 100) * 100);

    return Math.round(
      (txScore * this.weights.near.transactions) +
      (contractScore * this.weights.near.contractCalls) +
      (userScore * this.weights.near.uniqueUsers)
    );
  }
}
