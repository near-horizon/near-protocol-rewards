import { Logger } from '../utils/logger';
import { GitHubMetrics, NEARMetrics, RewardCalculation } from '../types';
import { BaseError, ErrorCode } from '../utils/errors';
import { createHash } from 'crypto';
import { PostgresStorage } from '../storage/postgres';

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

export interface RewardThresholds {
  minimumUsdReward: number;     
  maximumUsdReward: number;     
  monthlyPoolLimit: number;     
  minimumScore: number;         
}

export class MetricsCalculator {
  private readonly logger: Logger;
  private readonly weights: Required<MetricsCalculatorConfig['weights']>;
  private thresholds = {
    minimumScore: 25,           // Entry point for rewards
    minimumUsdReward: 250,      // Meaningful minimum reward
    maximumUsdReward: 10000,    // Aspirational maximum reward
    monthlyPoolLimit: 25000     // Monthly limit for flexibility
  };
  private readonly storage: PostgresStorage;

  constructor(
    config: MetricsCalculatorConfig,
    storage: PostgresStorage
  ) {
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
    this.storage = storage;
  }

  async calculateMetrics(github: GitHubMetrics, near: NEARMetrics): Promise<{
    github: { total: number };
    near: { total: number };
    total: number;
    reward?: RewardCalculation;
  }> {
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
        const reward = await this.calculateReward(totalScore, near.metadata.priceData.usd);
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

  async calculateReward(score: number, nearPrice: number): Promise<RewardCalculation> {
    // Exponential reward curve for better distribution
    const baseUsdReward = Math.pow(score/100, 1.5) * this.thresholds.maximumUsdReward;
    
    // Monthly pool check
    const monthlyUsage = await this.storage.getMonthlyRewardsUsage();
    const remainingPool = this.thresholds.monthlyPoolLimit - monthlyUsage;

    // Final calculation with limits
    const finalUsdReward = Math.min(
      Math.max(baseUsdReward, this.thresholds.minimumUsdReward),
      this.thresholds.maximumUsdReward,
      remainingPool
    );

    // Convert to yoctoNEAR
    const nearAmount = (finalUsdReward / nearPrice).toFixed(24);

    // Generate signature
    const signature = this.generateSignature(finalUsdReward, nearAmount);

    // Return properly typed reward calculation
    return {
      amount: finalUsdReward,
      breakdown: {
        github: score,
        near: score
      },
      score: {
        github: score,
        near: score,
        total: score,
        breakdown: {
          github: score,
          near: score
        }
      },
      rewards: {
        usdAmount: finalUsdReward,
        nearAmount,
        signature
      },
      metadata: {
        timestamp: Date.now(),
        periodStart: Date.now() - (24 * 60 * 60 * 1000),
        periodEnd: Date.now()
      }
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
    // Transaction count (40%)
    // Max score at 10,000 transactions/month
    const txScore = Math.min(100, (metrics.transactions.count / 10000) * 100);
    
    // Volume in NEAR (30%)
    // Assuming $5 NEAR price, targeting $1M monthly volume
    // 200,000 NEAR = ~$1M USD
    const volumeInNear = parseFloat(metrics.transactions.volume) / 1e24; // Convert from yoctoNEAR
    const volumeScore = Math.min(100, (volumeInNear / 200000) * 100);
    
    // Unique users (30%)
    // Max score at 1,000 unique users
    const userScore = Math.min(100, (metrics.transactions.uniqueUsers.length / 1000) * 100);

    return Math.round(
      (txScore * 0.4) + 
      (volumeScore * 0.3) + 
      (userScore * 0.3)
    );
  }

  private generateSignature(usdAmount: number, nearAmount: string): string {
    const data = JSON.stringify({
      usdAmount,
      nearAmount,
      timestamp: Date.now()
    });
    return createHash('sha256').update(data).digest('hex');
  }
}
