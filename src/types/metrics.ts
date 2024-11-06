import { ValidationError, ValidationResult, ValidationWarning } from './validation';

// Export interfaces
export type MetricsSource = 'github' | 'near' | 'sdk';
export type ValidationType = 'data' | 'cross' | 'security' | 'config';

export interface MetricsMetadata {
  collectionTimestamp: number;
  source: 'github' | 'near';
  projectId: string;
  periodStart: number;
  periodEnd: number;
}

export interface ValidationMetadata {
  source: MetricsSource;
  validationType: ValidationType;
}

export interface GitHubMetrics {
  commits: {
    count: number;
    authors: string[];
    frequency: number;
  };
  pullRequests: {
    merged: number;
    open: number;
    authors: string[];
  };
  issues: {
    closed: number;
    open: number;
    participants: string[];
    engagement: number;
  };
  metadata: {
    collectionTimestamp: number;
    source: 'github';
    projectId: string;
  };
}

export interface NEARMetrics {
  transactions: {
    count: number;
    volume: string;
    uniqueUsers: string[];
  };
  contract: {
    calls: number;
    uniqueCallers: string[];
  };
  metadata: {
    blockHeight: number;
    priceData: {
      usd: number;
      timestamp: number;
    };
    collectionTimestamp: number;
    source: 'near';
    projectId: string;
  };
}

// Add Score interface
export interface Score {
  total: number;
  breakdown: {
    github: number;
    near: number;
  };
}

// Update ProcessedMetrics to use Score interface
export interface ProcessedMetrics {
  github: GitHubMetrics;
  near: NEARMetrics;
  timestamp: number;
  collectionTimestamp: number;
  score: Score;  // Use Score interface here
  validation: ValidationResult;
  metadata: MetricsMetadata;
  projectId: string;
  periodStart: number;
  periodEnd: number;
}

export interface StoredMetrics {
  projectId: string;
  timestamp: number;
  github: GitHubMetrics;
  near: NEARMetrics;
  processed: ProcessedMetrics;
  validation: ValidationResult;
  signature: string;
  score: Score;  // Use Score interface here
}

// Simplified reward calculation interface
export interface RewardCalculation {
  score: {
    github: number;
    near: number;
    total: number;
    breakdown: {
      github: number;
      near: number;
    };
  };
  rewards: {
    usdAmount: number;
    nearAmount: string;
    signature: string;
  };
  metadata: {
    timestamp: number;
    periodStart: number;
    periodEnd: number;
  };
}

// Add missing error code
export enum ErrorCode {
  // ... existing codes ...
  UNAUTHORIZED = 'UNAUTHORIZED'  // Add this
}
