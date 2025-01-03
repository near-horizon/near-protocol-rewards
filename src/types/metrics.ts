import { ValidationResult } from "./validation";

export type MetricsSource = "github";

export interface Score {
  total: number;
  breakdown: {
    commits: number;
    pullRequests: number;
    reviews: number;
    issues: number;
  };
}

export interface MetricsMetadata {
  source: MetricsSource;
  projectId: string;
  collectionTimestamp: number;
  periodStart: number;
  periodEnd: number;
  timeframe?: 'week' | 'calendar-month' | 'month' | 'day';
}

export interface GitHubMetrics {
  commits: {
    count: number;
    frequency: {
      daily: number[];
      weekly: number;
      monthly: number;
    };
    authors: Array<{
      login: string;
      count: number;
    }>;
  };
  pullRequests: {
    open: number;
    merged: number;
    closed: number;
    authors: string[];
  };
  reviews: {
    count: number;
    authors: string[];
  };
  issues: {
    open: number;
    closed: number;
    participants: string[];
  };
  metadata: {
    collectionTimestamp: number;
    source: MetricsSource;
    projectId: string;
  };
}

export interface ProcessedMetrics {
  github: GitHubMetrics;
  score: Score;
  timestamp: number;
  collectionTimestamp: number;
  validation: ValidationResult;
  metadata: MetricsMetadata;
  periodStart: number;
  periodEnd: number;
}

export interface RewardCalculation {
  score: Score;
  breakdown: {
    commits: number;
    pullRequests: number;
    reviews: number;
    issues: number;
  };
  level: {
    name: string;
    minScore: number;
    maxScore: number;
    color: string;
  };
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    earnedAt: string;
    category: "commit" | "pr" | "review" | "issue";
  }>;
  metadata: {
    timestamp: number;
    periodStart: number;
    periodEnd: number;
    timeframe?: string; // Optional to maintain backward compatibility
    monthProgress?: {
      daysCompleted: number;
      daysRemaining: number;
      monthName: string;
      year: number;
    }; // Optional, only present for calendar-month timeframe
  };
}
