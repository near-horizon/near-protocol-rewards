/**
 * Core Type Definitions
 * 
 * Contains all shared types used throughout the SDK.
 * Maintains type safety and consistency across components.
 * 
 * Key type hierarchies:
 * - Metrics (GitHub, NEAR, Processed)
 * - Validation (Results, Errors)
 * - Configuration (Settings, Options)
 * 
 * @important
 * Update these types carefully as they affect the entire SDK
 */

import { z } from 'zod';
import { Logger } from '../utils/logger';

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
  maxTimeDrift?: number;    // milliseconds
  maxDataAge?: number;      // milliseconds
  minCorrelation?: number;  // 0-1
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

// Base metrics interface
export interface BaseMetrics {
  timestamp: number;
  projectId: string;
}

// GitHub metrics
export interface GitHubMetrics {
  timestamp: number;
  projectId: string;
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
  metadata: MetricsMetadata & {
    repoDetails?: {
      stars: number;
      forks: number;
    };
  };
}

// NEAR metrics
export interface NEARMetrics {
  contractCalls: any;
  timestamp: number;
  projectId: string;
  transactions: {
    count: number;
    volume: string;
    uniqueUsers: string[];
  };
  contract: {
    calls: number;
    uniqueCallers: string[];
  };
  metadata: MetricsMetadata & {
    blockHeight?: number;
    priceData?: NEARPrice;
  };
}

// Processed metrics
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
  collectionTimestamp: number;
  source: MetricsSource;
  projectId: string;
  periodStart: number;
  periodEnd: number;
}

// Storage type
export interface StoredMetrics {
  projectId: string;
  timestamp: number;
  github: GitHubMetrics;
  near: NEARMetrics;
  processed: ProcessedMetrics;
  signature: string;
  score: {
    total: number;
    breakdown: {
      github: number;
      near: number;
    };
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  timestamp: number;
  metadata: {
    source: MetricsSource;
    validationType: ValidationType;
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
  source: MetricsSource;
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

export interface ValidationMetadata {
  source: MetricsSource;
  validationType: 'data' | 'security';
}

export interface Metrics {
  timestamp: number;
  projectId: string;
  github: {
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
  };
  near: {
    transactions: {
      count: number;
      volume: string;
      uniqueUsers: string[];
    };
    contract: {
      calls: number;
      uniqueCallers: string[];
    };
  };
}

// Export all types from their respective files
export * from './metrics';
export * from './validation';
export * from './pipeline';
export * from './errors';

// Define shared types
export type MetricsSource = 'github' | 'near' | 'sdk';
export type ValidationType = 'data' | 'security' | 'config';

// Define base interfaces
export interface BaseMetrics {
  timestamp: number;
  projectId: string;
}

// Define validation metadata
export interface ValidationMetadata {
  source: MetricsSource;
  validationType: 'data' | 'security';
}

export interface RateLimitConfig {
  requestsPerSecond: number;
}

export interface CollectorConfig {
  logger: Logger;
  rateLimit?: number;  
}

export interface BaseCollectorConfig {
  logger: Logger;
}

export interface GitHubCollectorConfig extends BaseCollectorConfig {
  repo: string;
  token: string;
  rateLimit?: number; 
}

export interface NEARCollectorConfig extends BaseCollectorConfig {
  account: string;
  rateLimit?: number; 
}
