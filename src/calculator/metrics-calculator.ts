import { Logger } from '../utils/logger';
import { GitHubMetrics, NEARMetrics } from '../types';
import { CollectionError } from '../utils/errors';

interface MetricsWeights {
  github: {
    commitActivity: number;
    prQuality: number;
    communityEngagement: number;
  };
  near: {
    transactionVolume: number;
    contractUsage: number;
    userGrowth: number;
  };
}

interface CalculatorConfig {
  logger: Logger;
  weights?: Partial<MetricsWeights>;
}

export class MetricsCalculator {
  private readonly logger: Logger;
  private readonly weights: Required<MetricsWeights>;

  constructor(config: CalculatorConfig) {
    this.logger = config.logger;
    
    // Set default weights with required properties
    this.weights = {
      github: {
        commitActivity: config.weights?.github?.commitActivity ?? 0.4,
        prQuality: config.weights?.github?.prQuality ?? 0.3,
        communityEngagement: config.weights?.github?.communityEngagement ?? 0.3
      },
      near: {
        transactionVolume: config.weights?.near?.transactionVolume ?? 0.4,
        contractUsage: config.weights?.near?.contractUsage ?? 0.3,
        userGrowth: config.weights?.near?.userGrowth ?? 0.3
      }
    };

    // Validate weights sum to 1
    this.validateWeights();
  }

  private validateWeights(): void {
    const githubSum = Object.values(this.weights.github).reduce((a, b) => a + b, 0);
    const nearSum = Object.values(this.weights.near).reduce((a, b) => a + b, 0);

    if (Math.abs(githubSum - 1) > 0.001) {
      this.logger.warn('GitHub weights do not sum to 1', { 
        sum: githubSum, 
        weights: this.weights.github 
      });
    }

    if (Math.abs(nearSum - 1) > 0.001) {
      this.logger.warn('NEAR weights do not sum to 1', { 
        sum: nearSum, 
        weights: this.weights.near 
      });
    }
  }

  calculateMetrics(github: GitHubMetrics, near: NEARMetrics): {
    github: ReturnType<typeof this.calculateGitHubScore>;
    near: ReturnType<typeof this.calculateNEARScore>;
    total: number;
  } {
    try {
      const githubScore = this.calculateGitHubScore(github);
      const nearScore = this.calculateNEARScore(near);

      return {
        github: githubScore,
        near: nearScore,
        total: Math.round((githubScore.total + nearScore.total) / 2)
      };
    } catch (error) {
      this.logger.error('Failed to calculate metrics', { error });
      throw new CollectionError('Metrics calculation failed', { error });
    }
  }

  private calculateGitHubScore(metrics: GitHubMetrics) {
    // Calculate individual scores
    const commitActivity = Math.min(1, metrics.commits.frequency / 10) * 
      this.weights.github.commitActivity;

    const prQuality = Math.min(1, metrics.pullRequests.merged / 
      Math.max(1, metrics.pullRequests.open + metrics.pullRequests.merged)) * 
      this.weights.github.prQuality;

    // Community engagement score (0-1)
    const uniqueContributors = new Set([
      ...metrics.commits.authors,
      ...metrics.pullRequests.authors,
      ...metrics.issues.participants
    ]).size;

    const communityEngagement = Math.min(1, uniqueContributors / 10) * 
      this.weights.github.communityEngagement;

    return {
      commitActivity,
      prQuality,
      communityEngagement,
      total: Math.round((commitActivity + prQuality + communityEngagement) * 100)
    };
  }

  private calculateNEARScore(metrics: NEARMetrics) {
    // Transaction volume score (0-1)
    const volume = parseFloat(metrics.transactions.volume);
    const transactionVolume = Math.min(1, volume / 10000) * 
      this.weights.near.transactionVolume;

    // Contract usage score (0-1)
    const contractUsage = Math.min(1, metrics.contract.calls / 1000) * 
      this.weights.near.contractUsage;

    // User growth score (0-1)
    const uniqueUsers = new Set([
      ...metrics.transactions.uniqueUsers,
      ...metrics.contract.uniqueCallers
    ]).size;

    const userGrowth = Math.min(1, uniqueUsers / 100) * 
      this.weights.near.userGrowth;

    return {
      transactionVolume,
      contractUsage,
      userGrowth,
      total: Math.round((transactionVolume + contractUsage + userGrowth) * 100)
    };
  }

  // Helper method to get current weights configuration
  getWeights(): Required<MetricsWeights> {
    return { ...this.weights };
  }
}
