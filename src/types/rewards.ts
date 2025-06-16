/**
 * Reward system interfaces and types
 */

import { OnchainMetrics } from "./metrics";

/**
 * Breakdown of on-chain scoring categories
 */
export interface OnchainScoreBreakdown {
  transactionVolume: number;
  smartContractCalls: number;
  uniqueWallets: number;
}

/**
 * Result of on-chain calculation with metadata
 */
export interface OnchainCalculationResult {
  rawMetrics: OnchainMetrics;
  scoreBreakdown: OnchainScoreBreakdown;
  totalScore: number;
  metadata: {
    calculationTimestamp: number;
    thresholds: {
      transactionVolume: number;
      smartContractCalls: number;
      uniqueWallets: number;
    };
    maxPoints: {
      transactionVolume: number;
      smartContractCalls: number;
      uniqueWallets: number;
      total: number;
    };
  };
}

/**
 * Represents a reward tier in the system
 */
export interface RewardTier {
  name: string;
  emoji: string;
  minScore: number;
  maxScore: number;
  reward: number;
  color: string;
}

/**
 * Breakdown of off-chain scoring categories
 */
export interface OffchainScoreBreakdown {
  commits: number;
  pullRequests: number;
  reviews: number;
  issues: number;
}

/**
 * Result of off-chain calculation with metadata
 */
export interface OffchainCalculationResult {
  scoreBreakdown: OffchainScoreBreakdown;
  totalScore: number;
  metadata: {
    calculationTimestamp: number;
    maxPoints: {
      commits: number;
      pullRequests: number;
      reviews: number;
      issues: number;
      total: number;
    };
  };
}

/**
 * Complete rewards calculation result
 */
export interface TotalRewardsResult {
  onchainScore: number;
  offchainScore: number;
  totalScore: number;
  tier: RewardTier;
  breakdown: {
    onchain: {
      transactionVolume: number;
      smartContractCalls: number;
      uniqueWallets: number;
    };
    offchain: {
      commits: number;
      pullRequests: number;
      reviews: number;
      issues: number;
    };
  };
  metadata: {
    calculationTimestamp: number;
    weights: {
      onchain: number;
      offchain: number;
    };
  };
} 