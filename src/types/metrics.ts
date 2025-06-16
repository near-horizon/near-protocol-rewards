/**
 * Types for GitHub metrics
 */

export interface GitHubAuthor {
  login: string;
  count: number;
}

export interface CommitFrequency {
  daily: number[];  // Array of 7 elements representing days of the week (0 = Sunday)
  weekly: number;
  monthly: number;
}

export interface GitHubCommitMetrics {
  count: number;
  frequency: CommitFrequency;
  authors: GitHubAuthor[];
}

export interface GitHubPullRequestMetrics {
  open: number;
  merged: number;
  closed: number;
  authors: string[];
}

export interface GitHubReviewMetrics {
  count: number;
  authors: string[];
}

export interface GitHubIssueMetrics {
  open: number;
  closed: number;
  participants: string[];
}

export interface MetricsMetadata {
  collectionTimestamp: number;
  source: string;
  projectId: string;
}

export interface GitHubMetrics {
  commits: GitHubCommitMetrics;
  pullRequests: GitHubPullRequestMetrics;
  reviews: GitHubReviewMetrics;
  issues: GitHubIssueMetrics;
  metadata: MetricsMetadata;
}

export interface OffchainRewardScore {
  total: number;
  breakdown: {
    commits: number;
    pullRequests: number;
    reviews: number;
    issues: number;
  };
}

export interface RewardLevel {
  name: string;
  threshold: number;
  multiplier: number;
}

export interface OffchainRewards {
  score: OffchainRewardScore;
  level: RewardLevel;
  totalReward: number;
}

// On-chain metrics types

export interface NearTransaction {
  transaction_hash: string;
  predecessor_account_id: string;
  receiver_account_id: string;
  actions: NearAction[];
  actions_agg?: {
    deposit?: string;
  };
  block_timestamp: string;
}

export interface NearAction {
  action: string;
  deposit?: string;
  method_name?: string;
  args?: any;
}

export interface NearTransactionData {
  metadata: {
    period: {
      start_date: string;
      end_date: string;
    };
    account_id: string;
    timestamp: string;
  };
  transactions: NearTransaction[];
}

export interface OnchainMetrics {
  transactionVolume: number; // in NEAR tokens
  contractInteractions: number;
  uniqueWallets: number;
  transactionCount: number;
  metadata: MetricsMetadata;
}

export interface OnchainRewardScore {
  total: number;
  breakdown: {
    transactionVolume: number;
    contractInteractions: number;
    uniqueWallets: number;
  };
}

export interface OnchainRewards {
  score: OnchainRewardScore;
  level: RewardLevel;
  totalReward: number;
} 