import { Logger } from '../utils/logger';
import { GitHubMetrics, NEARMetrics, RewardCalculation } from '../types';
import { BaseError, ErrorCode } from '../utils/errors';

interface MetricsCalculatorConfig {
  logger: Logger;
  weights: {
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
  };
  thresholds?: {
    minimumScore?: number;  // Minimum score required for rewards
    minimumUsdReward?: number;  // Minimum USD reward amount
    maximumUsdReward?: number;  // Maximum USD reward amount
  };
}

export class MetricsCalculator {
  private readonly logger: Logger;
  private readonly weights: Required<MetricsCalculatorConfig['weights']>;
  private readonly thresholds: Required<NonNullable<MetricsCalculatorConfig['thresholds']>>;

  constructor(config: MetricsCalculatorConfig) {
    this.logger = config.logger;
    this.weights = {
      github: {
        commits: config.weights.github.commits,
        pullRequests: config.weights.github.pullRequests,
        issues: config.weights.github.issues
      },
      near: {
        transactions: config.weights.near.transactions,
        contractCalls: config.weights.near.contractCalls,
        uniqueUsers: config.weights.near.uniqueUsers
      }
    };
    
    // Set default thresholds
    this.thresholds = {
      minimumScore: config.thresholds?.minimumScore ?? 10, // Minimum 10% score
      minimumUsdReward: config.thresholds?.minimumUsdReward ?? 100, // Minimum $100 USD
      maximumUsdReward: config.thresholds?.maximumUsdReward ?? 10000 // Maximum $10,000 USD
    };
  }

  calculateMetrics(github: GitHubMetrics, near: NEARMetrics): {
    github: { total: number };
    near: { total: number };
    total: number;
    reward?: RewardCalculation;
  } {
    try {
      const githubScore = this.calculateGitHubScore(github);
      const nearScore = this.calculateNEARScore(near);
      const totalScore = Math.round((githubScore + nearScore) / 2);

      // Check if score meets minimum threshold
      if (totalScore < this.thresholds.minimumScore) {
        this.logger.info('Score below minimum threshold', {
          score: totalScore,
          minimum: this.thresholds.minimumScore
        });
        return {
          github: { total: githubScore },
          near: { total: nearScore },
          total: totalScore
        };
      }

      // Calculate reward if price data is available
      if (near.metadata.priceData) {
        const reward = this.calculateReward(totalScore, near.metadata.priceData.usd);
        return {
          github: { total: githubScore },
          near: { total: nearScore },
          total: totalScore,
          reward
        };
      }

      return {
        github: { total: githubScore },
        near: { total: nearScore },
        total: totalScore
      };
    } catch (error) {
      this.logger.error('Failed to calculate metrics', { error });
      throw new BaseError(
        'Metrics calculation failed',
        ErrorCode.CALCULATION_ERROR,
        { error }
      );
    }
  }

  private calculateReward(score: number, nearPrice: number): RewardCalculation {
    // Calculate base USD reward
    const baseUsdReward = (score / 100) * this.thresholds.maximumUsdReward;
    
    // Apply thresholds
    const usdAmount = Math.min(
      Math.max(baseUsdReward, this.thresholds.minimumUsdReward),
      this.thresholds.maximumUsdReward
    );

    // Convert to NEAR
    const nearAmount = usdAmount / nearPrice;

    return {
      usdAmount,
      nearAmount,
      score,
      timestamp: Date.now()
    };
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
    const volumeNum = parseFloat(metrics.transactions.volume);
    const txScore = Math.min(100, (metrics.transactions.count / 1000) * 100);
    const volumeScore = Math.min(100, (volumeNum / 10000) * 100);
    const userScore = Math.min(100, (metrics.transactions.uniqueUsers.length / 100) * 100);

    return Math.round(
      (txScore * this.weights.near.transactions) +
      (volumeScore * this.weights.near.contractCalls) +
      (userScore * this.weights.near.uniqueUsers)
    );
  }
}
