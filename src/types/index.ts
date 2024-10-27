import { z } from 'zod';

// Storage configuration
export interface StorageConfig {
  type: 'postgres';
  config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
}

// Weight configurations
export interface GitHubWeights {
  commits: number;
  pullRequests: number;
  issues: number;
}

export interface NEARWeights {
  transactions: number;
  contractCalls: number;
  uniqueUsers: number;
}

// Validation configurations
export interface ValidationConfig {
  github?: {
    minCommits?: number;
    maxCommitsPerDay?: number;
    minAuthors?: number;
  };
  near?: {
    minTransactions?: number;
    maxTransactionsPerDay?: number;
    minUniqueUsers?: number;
  };
}

// SDK Configuration Schema
export const SDKConfigSchema = z.object({
  projectId: z.string(),
  nearAccount: z.string(),
  githubRepo: z.string(),
  githubToken: z.string(),
  storage: z.object({
    type: z.literal('postgres'),
    config: z.object({
      host: z.string(),
      port: z.number(),
      database: z.string(),
      user: z.string(),
      password: z.string()
    })
  }).optional(),
  weights: z.object({
    github: z.object({
      commits: z.number(),
      pullRequests: z.number(),
      issues: z.number()
    }).partial().optional(),
    near: z.object({
      transactions: z.number(),
      contractCalls: z.number(),
      uniqueUsers: z.number()
    }).partial().optional()
  }).optional(),
  validation: z.object({
    github: z.object({
      minCommits: z.number(),
      maxCommitsPerDay: z.number(),
      minAuthors: z.number()
    }).partial().optional(),
    near: z.object({
      minTransactions: z.number(),
      maxTransactionsPerDay: z.number(),
      minUniqueUsers: z.number()
    }).partial().optional()
  }).optional()
});

// Export the SDK configuration type
export type SDKConfig = z.infer<typeof SDKConfigSchema>;

// Metric types
export interface GitHubMetrics {
  commits: {
    count: number;
    frequency: number;
    authors: string[];
  };
  pullRequests: {
    open: number;
    merged: number;
    authors: string[];
  };
  issues: {
    open: number;
    closed: number;
    participants: string[];
  };
  metadata: {
    collectionTimestamp: number;
    source: 'github';
    projectId: string;
    periodStart: number;
    periodEnd: number;
  };
}

export interface NEARMetrics {
  transactions: {
    count: number;
    volume: string;  // Volume in USD
    uniqueUsers: string[];
  };
  contract: {
    calls: number;
    uniqueCallers: string[];
  };
  metadata: {
    collectionTimestamp: number;
    source: 'near';
    projectId: string;
    periodStart: number;
    periodEnd: number;
    priceData: NEARPrice;  // Add price data to metadata
  };
}

export interface ProcessedMetrics {
  timestamp: number;
  github: GitHubMetrics;
  near: NEARMetrics;
  score: {
    total: number;
    breakdown: {
      github: number;
      near: number;
    };
  };
  validation: ValidationResult;
  metadata: MetricsMetadata;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  timestamp: number;
  metadata: {
    source: 'github' | 'near';
    validationType: 'data' | 'security';
  };
}

export interface ValidationError {
  code: string;
  message: string;
  context?: Record<string, any>;
}

export interface ValidationWarning {
  code: string;
  message: string;
  context?: Record<string, any>;
}

export interface MetricsMetadata {
  collectionTimestamp: number;
  source: 'github' | 'near';
  projectId: string;
  periodStart: number;
  periodEnd: number;
}

export interface NEARPrice {
  usd: number;
  timestamp: number;
}

// Add reward calculation types
export interface RewardCalculation {
  usdAmount: number;
  nearAmount: number;
  score: number;
  timestamp: number;
}

// Update ErrorCode enum
export enum ErrorCode {
  // ... existing error codes ...
  CALCULATION_ERROR = 'CALCULATION_ERROR',
  PRICE_DATA_ERROR = 'PRICE_DATA_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}
