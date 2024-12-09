/**
 * GitHub Rewards Calculator
 * Calculates developer rewards based on GitHub activity metrics
 */

import { GitHubMetrics, Score, RewardCalculation } from "../types/metrics";
import { Logger } from "../utils/logger";
import { GitHubValidator } from "../validators/github";

export interface ActivityWeights {
  commits: number;
  pullRequests: number;
  reviews: number;
  issues: number;
}

export interface ActivityThresholds {
  commits: number;
  pullRequests: number;
  reviews: number;
  issues: number;
}

export interface Level {
  name: string;
  minScore: number;
  maxScore: number;
  color: string;
}

export const DEFAULT_WEIGHTS: ActivityWeights = {
  commits: 0.3,
  pullRequests: 0.3,
  reviews: 0.2,
  issues: 0.2,
} as const;

export const DEFAULT_THRESHOLDS: ActivityThresholds = {
  commits: 100,
  pullRequests: 20,
  reviews: 30,
  issues: 30,
} as const;

const LEVELS: Level[] = [
  { name: "Diamond", minScore: 90, maxScore: 100, color: "#B9F2FF" },
  { name: "Platinum", minScore: 80, maxScore: 89, color: "#E5E4E2" },
  { name: "Gold", minScore: 70, maxScore: 79, color: "#FFD700" },
  { name: "Silver", minScore: 60, maxScore: 69, color: "#C0C0C0" },
  { name: "Bronze", minScore: 50, maxScore: 59, color: "#CD7F32" },
  { name: "Member", minScore: 0, maxScore: 49, color: "#A4A4A4" },
];

export class GitHubRewardsCalculator {
  constructor(
    private readonly weights: {
      commits: number;
      pullRequests: number;
      reviews: number;
      issues: number;
    },
    private readonly thresholds: {
      commits: number;
      pullRequests: number;
      reviews: number;
      issues: number;
    },
    private readonly logger: Logger,
    private readonly validator: GitHubValidator,
  ) {}

  calculateRewards(
    metrics: GitHubMetrics,
    timeframe: string,
  ): RewardCalculation {
    const score = this.calculateScore(metrics);
    const now = Date.now();
    let periodStart: number;

    switch (timeframe) {
      case "day":
        periodStart = now - 24 * 60 * 60 * 1000;
        break;
      case "week":
        periodStart = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        periodStart = now - 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        periodStart = now - 7 * 24 * 60 * 60 * 1000; // Default to week
    }

    // Calculate level based on score
    const level = this.determineLevel(score.total);

    // Calculate achievements
    const achievements = this.calculateAchievements(metrics);

    return {
      score,
      breakdown: score.breakdown,
      level,
      achievements,
      metadata: {
        timestamp: now,
        periodStart,
        periodEnd: now,
      },
    };
  }

  private calculateScore(metrics: GitHubMetrics): Score {
    const commitScore =
      Math.min(metrics.commits.count / this.thresholds.commits, 1) *
      this.weights.commits *
      100;
    const prScore =
      Math.min(metrics.pullRequests.merged / this.thresholds.pullRequests, 1) *
      this.weights.pullRequests *
      100;
    const reviewScore =
      Math.min(metrics.reviews.count / this.thresholds.reviews, 1) *
      this.weights.reviews *
      100;
    const issueScore =
      Math.min(metrics.issues.closed / this.thresholds.issues, 1) *
      this.weights.issues *
      100;

    return {
      total: Math.min(commitScore + prScore + reviewScore + issueScore, 100),
      breakdown: {
        commits: commitScore,
        pullRequests: prScore,
        reviews: reviewScore,
        issues: issueScore,
      },
    };
  }

  private determineLevel(score: number): RewardCalculation["level"] {
    if (score >= 90) {
      return { name: "Diamond", minScore: 90, maxScore: 100, color: "#B9F2FF" };
    } else if (score >= 80) {
      return { name: "Platinum", minScore: 80, maxScore: 89, color: "#E5E4E2" };
    } else if (score >= 70) {
      return { name: "Gold", minScore: 70, maxScore: 79, color: "#FFD700" };
    } else if (score >= 60) {
      return { name: "Silver", minScore: 60, maxScore: 69, color: "#C0C0C0" };
    } else if (score >= 50) {
      return { name: "Bronze", minScore: 50, maxScore: 59, color: "#CD7F32" };
    } else {
      return { name: "Member", minScore: 0, maxScore: 49, color: "#A4A4A4" };
    }
  }

  private calculateAchievements(
    metrics: GitHubMetrics,
  ): RewardCalculation["achievements"] {
    const achievements: RewardCalculation["achievements"] = [];
    const now = new Date().toISOString();

    // Commit achievements
    if (metrics.commits.count >= this.thresholds.commits) {
      achievements.push({
        id: "commit-master",
        name: "Commit Master",
        description: `Made ${this.thresholds.commits} or more commits`,
        earnedAt: now,
        category: "commit",
      });
    }

    // PR achievements
    if (metrics.pullRequests.merged >= this.thresholds.pullRequests) {
      achievements.push({
        id: "pr-master",
        name: "PR Master",
        description: `Merged ${this.thresholds.pullRequests} or more pull requests`,
        earnedAt: now,
        category: "pr",
      });
    }

    // Review achievements
    if (metrics.reviews.count >= this.thresholds.reviews) {
      achievements.push({
        id: "review-expert",
        name: "Review Expert",
        description: `Completed ${this.thresholds.reviews} or more code reviews`,
        earnedAt: now,
        category: "review",
      });
    }

    // Issue achievements
    if (metrics.issues.closed >= this.thresholds.issues) {
      achievements.push({
        id: "issue-resolver",
        name: "Issue Resolver",
        description: `Closed ${this.thresholds.issues} or more issues`,
        earnedAt: now,
        category: "issue",
      });
    }

    return achievements;
  }
}
