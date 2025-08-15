/**
 * NEAR Protocol Rewards Calculator
 * 
 * Calculates final rewards by combining on-chain (20%) and off-chain (80%) scores
 * and determines reward tiers based on total points achieved.
 * 
 * Based on Cohort 2 scoring system:
 * - Off-Chain (GitHub): 80 points (80%)
 * - On-Chain (Blockchain): 20 points (20%)
 */

import { 
  OnchainCalculationResult,
  RewardTier, 
  OffchainScoreBreakdown, 
  OffchainCalculationResult, 
  TotalRewardsResult 
} from "../types";
import { Logger } from "../utils/logger";

/**
 * Main Rewards Calculator Class
 */
export class RewardsCalculator {
  private readonly logger?: Logger;

  // Reward tiers based on total score (out of 100 points)
  private readonly rewardTiers: RewardTier[] = [
    {
      name: "Diamond",
      emoji: "💎",
      minScore: 85,
      maxScore: 100,
      reward: 10000,
      color: "#B9F2FF"
    },
    {
      name: "Gold", 
      emoji: "🟡",
      minScore: 70,
      maxScore: 84,
      reward: 6000,
      color: "#FFD700"
    },
    {
      name: "Silver",
      emoji: "⚪",
      minScore: 55,
      maxScore: 69,
      reward: 3000,
      color: "#C0C0C0"
    },
    {
      name: "Bronze",
      emoji: "🟤",
      minScore: 40,
      maxScore: 54,
      reward: 1000,
      color: "#CD7F32"
    },
    {
      name: "Contributor",
      emoji: "⚫",
      minScore: 20,
      maxScore: 39,
      reward: 500,
      color: "#8B4513"
    },
    {
      name: "Explorer",
      emoji: "⚫",
      minScore: 1,
      maxScore: 19,
      reward: 100,
      color: "#A4A4A4"
    },
    {
      name: "Member",
      emoji: "⚫",
      minScore: 0,
      maxScore: 0,
      reward: 0,
      color: "#808080"
    }
  ];

  // Score weights
  private readonly weights = {
    onchain: 0.20,  // 20%
    offchain: 0.80  // 80%
  };

  // Maximum points for off-chain categories (total 80 points)
  private readonly offchainMaxPoints = {
    commits: 28,        // 28 points max (100 meaningful commits)
    pullRequests: 22,   // 22 points max (25 merged PRs)
    reviews: 16,        // 16 points max (30 substantive reviews)
    issues: 14,         // 14 points max (30 closed issues)
    total: 80           // 80 points total for off-chain
  };

  constructor(logger?: Logger) {
    this.logger = logger;
  }

  /**
   * Logs a message if logger is available
   */
  private log(message: string, data?: any): void {
    if (this.logger) {
      this.logger.info(message, data);
    }
  }

  /**
   * Determines reward tier based on total score
   */
  private determineTier(totalScore: number): RewardTier {
    // Sort tiers by minScore descending to check highest tiers first
    const sortedTiers = [...this.rewardTiers].sort((a, b) => b.minScore - a.minScore);
    
    for (const tier of sortedTiers) {
      if (totalScore >= tier.minScore) {
        return tier;
      }
    }
    
    // Default to Member tier if no match found (score is 0)
    return this.rewardTiers[this.rewardTiers.length - 1];
  }

  /**
   * Calculates off-chain score based on GitHub metrics
   */
  calculateOffchainScore(
    commits: number,
    pullRequests: number,
    reviews: number,
    issues: number
  ): OffchainCalculationResult {
    this.log("🧮 Calculating off-chain score (GitHub)");

    // Thresholds for maximum points
    const thresholds = {
      commits: 100,      // 100 meaningful commits
      pullRequests: 25,  // 25 merged PRs
      reviews: 30,       // 30 substantive reviews
      issues: 30         // 30 closed issues
    };

    // Calculate individual scores
    const commitsScore = Math.min(commits / thresholds.commits, 1) * this.offchainMaxPoints.commits;
    const pullRequestsScore = Math.min(pullRequests / thresholds.pullRequests, 1) * this.offchainMaxPoints.pullRequests;
    const reviewsScore = Math.min(reviews / thresholds.reviews, 1) * this.offchainMaxPoints.reviews;
    const issuesScore = Math.min(issues / thresholds.issues, 1) * this.offchainMaxPoints.issues;

    const totalScore = commitsScore + pullRequestsScore + reviewsScore + issuesScore;

    const scoreBreakdown: OffchainScoreBreakdown = {
      commits: commitsScore,
      pullRequests: pullRequestsScore,
      reviews: reviewsScore,
      issues: issuesScore
    };

    this.log("📊 Off-chain scores calculated:", {
      commits: `${commitsScore.toFixed(2)}/${this.offchainMaxPoints.commits}`,
      pullRequests: `${pullRequestsScore.toFixed(2)}/${this.offchainMaxPoints.pullRequests}`,
      reviews: `${reviewsScore.toFixed(2)}/${this.offchainMaxPoints.reviews}`,
      issues: `${issuesScore.toFixed(2)}/${this.offchainMaxPoints.issues}`,
      total: `${totalScore.toFixed(2)}/${this.offchainMaxPoints.total}`
    });

    return {
      scoreBreakdown,
      totalScore,
      metadata: {
        calculationTimestamp: Date.now(),
        maxPoints: this.offchainMaxPoints
      }
    };
  }

  /**
   * Calculates total rewards by combining on-chain and off-chain scores
   */
  calculateTotalRewards(
    onchainResult?: OnchainCalculationResult,
    offchainResult?: OffchainCalculationResult
  ): TotalRewardsResult {
    this.log("\n🧮 Calculating total rewards (onchain + offchain)");

    // Handle cases where data might be missing
    const onchainScore = onchainResult?.totalScore || 0;
    const offchainScore = offchainResult?.totalScore || 0;

    // Calculate weighted total score
    const totalScore = onchainScore + offchainScore;

    this.log(`📊 Combined scores:`, {
      onchain: `${onchainScore.toFixed(2)}/20`,
      offchain: `${offchainScore.toFixed(2)}/80`,
      total: `${totalScore.toFixed(2)}/100`
    });

    // Determine tier and reward
    const tier = this.determineTier(totalScore);
    
    this.log(`🏆 Tier achieved: ${tier.emoji} ${tier.name}`);
    this.log(`💰 Reward: $${tier.reward.toLocaleString()}`);

    // Build breakdown
    const breakdown = {
      onchain: onchainResult?.scoreBreakdown || {
        transactionVolume: 0,
        smartContractCalls: 0,
        uniqueWallets: 0
      },
      offchain: offchainResult?.scoreBreakdown || {
        commits: 0,
        pullRequests: 0,
        reviews: 0,
        issues: 0
      }
    };

    return {
      onchainScore,
      offchainScore,
      totalScore,
      tier,
      breakdown,
      metadata: {
        calculationTimestamp: Date.now(),
        weights: this.weights
      }
    };
  }

  /**
   * Calculates rewards with only on-chain data
   */
  calculateOnchainOnlyRewards(onchainResult: OnchainCalculationResult): TotalRewardsResult {
    this.log("🔗 Calculating rewards with on-chain data only");
    return this.calculateTotalRewards(onchainResult, undefined);
  }

  /**
   * Calculates rewards with only off-chain data
   */
  calculateOffchainOnlyRewards(offchainResult: OffchainCalculationResult): TotalRewardsResult {
    this.log("📋 Calculating rewards with off-chain data only");
    return this.calculateTotalRewards(undefined, offchainResult);
  }

  /**
   * Gets all available reward tiers
   */
  getRewardTiers(): RewardTier[] {
    return this.rewardTiers;
  }

  /**
   * Gets scoring weights
   */
  getWeights(): { onchain: number; offchain: number } {
    return this.weights;
  }

  /**
   * Validates score ranges
   */
  validateScores(onchainScore?: number, offchainScore?: number): boolean {
    if (onchainScore !== undefined && (onchainScore < 0 || onchainScore > 20)) {
      this.log("❌ Validation failed: On-chain score must be between 0 and 20");
      return false;
    }

    if (offchainScore !== undefined && (offchainScore < 0 || offchainScore > 80)) {
      this.log("❌ Validation failed: Off-chain score must be between 0 and 80");
      return false;
    }

    return true;
  }
}
