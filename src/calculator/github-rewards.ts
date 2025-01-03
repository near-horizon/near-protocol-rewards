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

export interface MonthProgress {
  daysCompleted: number;
  daysRemaining: number;
  monthName: string;
  year: number;
}

export class GitHubRewardsCalculator {
  private getMonthProgress(timestamp: number): MonthProgress {
    const date = new Date(timestamp);
    // Ensure we're working with a valid date
    if (isNaN(date.getTime())) {
      throw new Error('Invalid timestamp provided for month progress calculation');
    }
    const year = date.getFullYear();
    const month = date.getMonth();
    const currentDay = date.getDate();
    
    // Get last day of current month
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    return {
      daysCompleted: currentDay,
      daysRemaining: lastDay - currentDay,
      monthName: monthNames[month],
      year: year
    };
  }
  private readonly weights: ActivityWeights;
  private readonly thresholds: ActivityThresholds;
  private readonly logger: Logger;
  private readonly validator: GitHubValidator;

  constructor(config: {
    weights: ActivityWeights;
    thresholds: ActivityThresholds;
    logger: Logger;
    validator: GitHubValidator;
  }) {
    this.weights = config.weights;
    this.thresholds = config.thresholds;
    this.logger = config.logger;
    this.validator = config.validator;
  }

  calculateRewards(
    metrics: GitHubMetrics,
    timeframe: string,
  ): RewardCalculation {
    const score = this.calculateScore(metrics, timeframe);
    const level = this.determineLevel(score.total);
    const achievements = this.calculateAchievements(metrics);

    // Use metrics collection timestamp or current time
    const currentDate = metrics.metadata?.collectionTimestamp 
      ? new Date(metrics.metadata.collectionTimestamp)
      : new Date();

    let periodStart: Date;
    let periodEnd: Date;

    if (timeframe === 'calendar-month') {
      // For calendar month, use first and last day of current month
      periodStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      periodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    } else {
      // Default to weekly calculation
      periodEnd = new Date(currentDate);
      periodStart = new Date(periodEnd);
      periodStart.setDate(periodEnd.getDate() - 7);
    }

    // Get month progress for calendar month calculations
    let monthProgress: MonthProgress | undefined;
    if (timeframe === 'calendar-month') {
      monthProgress = this.getMonthProgress(currentDate.getTime());
    }

    return {
      score,
      breakdown: score.breakdown,
      level,
      achievements,
      metadata: {
        timestamp: currentDate.getTime(),
        periodStart: periodStart.getTime(),
        periodEnd: periodEnd.getTime(),
        timeframe,
        monthProgress
      }
    };
  }

  private calculateScore(metrics: GitHubMetrics, timeframe: string = 'week'): Score {
    // Adjust thresholds based on timeframe
    const periodMultiplier = (() => {
      switch (timeframe) {
        case 'calendar-month':
          return 4; // Use 4x multiplier for calendar month to match weekly scoring
        case 'month':
          return 4; // 4 weeks (keep for backward compatibility)
        case 'day':
          return 1/7; // 1/7 of a week
        default:
          return 1; // week is the base unit
      }
    })();

    const adjustedThresholds = {
      commits: this.thresholds.commits * periodMultiplier,
      pullRequests: this.thresholds.pullRequests * periodMultiplier,
      reviews: this.thresholds.reviews * periodMultiplier,
      issues: this.thresholds.issues * periodMultiplier
    };

    // Calculate individual scores with super-enhanced progressive scaling
    const calculateProgressiveScore = (actual: number, threshold: number, weight: number) => {
      const ratio = actual / threshold;
      // Super-enhanced progressive scaling with more aggressive exponential growth
      const scaledRatio = ratio <= 1 
        ? ratio 
        : 1 + Math.pow(ratio - 1, 0.5); // Even more aggressive scaling for higher ratios
      const baseScore = Math.min(scaledRatio * weight * 100, weight * 200); // Allow up to 200% per category
      // Apply additional boost for exceeding threshold significantly
      return ratio > 2 ? baseScore * 1.2 : baseScore; // Extra 20% boost for high performers
    };

    const commitScore = calculateProgressiveScore(
      metrics.commits.count,
      adjustedThresholds.commits,
      this.weights.commits
    );

    const prScore = calculateProgressiveScore(
      metrics.pullRequests.merged,
      adjustedThresholds.pullRequests,
      this.weights.pullRequests
    );

    const reviewScore = calculateProgressiveScore(
      metrics.reviews.count,
      adjustedThresholds.reviews,
      this.weights.reviews
    );

    const issueScore = calculateProgressiveScore(
      metrics.issues.closed,
      adjustedThresholds.issues,
      this.weights.issues
    );

    // Calculate total score with super-enhanced scaling
    const rawTotal = commitScore + prScore + reviewScore + issueScore;
    // Scale to ensure Diamond tier (90-100) is achievable
    const scaledTotal = Math.min(Math.max(rawTotal * 1.3, 0), 100); // Increased multiplier to 1.3
    const scalingFactor = rawTotal > 0 ? scaledTotal / rawTotal : 1;

    return {
      total: scaledTotal,
      breakdown: {
        commits: commitScore * scalingFactor,
        pullRequests: prScore * scalingFactor,
        reviews: reviewScore * scalingFactor,
        issues: issueScore * scalingFactor,
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
