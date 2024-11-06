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
import { JSONValue, ErrorDetail } from './json';

// Define core types first to avoid private name issues
export type MetricsSource = 'github' | 'near' | 'sdk';
export type ValidationType = 'data' | 'cross' | 'security' | 'config';

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
  maxTimeDrift?: number;
  maxDataAge?: number;
  minCorrelation?: number;
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
  }).optional()
});

export type SDKConfig = z.infer<typeof SDKConfigSchema>;

// Collector configurations
export interface BaseCollectorConfig {
  logger: Logger;
  maxRequestsPerSecond?: number;
}

export interface GitHubCollectorConfig extends BaseCollectorConfig {
  repo: string;
  token: string;
}

export interface NEARCollectorConfig extends BaseCollectorConfig {
  account: string;
}

// Re-export from other type files
export {
  JSONValue,
  ErrorDetail
} from './json';

export {
  ValidationError,
  ValidationWarning,
  ValidationResult
} from './validation';

export {
  GitHubMetrics,
  NEARMetrics,
  ProcessedMetrics,
  StoredMetrics,
  MetricsMetadata
} from './metrics';

// Export error codes
export { ErrorCode } from './errors';

// Export logger types
export { LogContext, ErrorLogContext } from './logger';

// Export core types
export * from './json';
export * from './validation';
export * from './metrics';
export * from './pipeline';
export * from './errors';
export * from './logger';
export * from './sdk';

// Export additional types
export interface RewardCalculation {
  score: any;
  rewards: any;
  amount: number;
  breakdown: {
    github: number;
    near: number;
  };
  metadata: {
    timestamp: number;
    periodStart: number;
    periodEnd: number;
  };
}

export interface ValidationThresholds {
  github: {
    minCommits: number;
    maxCommitsPerDay: number;
    minAuthors: number;
  };
  near: {
    minTransactions: number;
    maxTransactionsPerDay: number;
    minUniqueUsers: number;
    minContractCalls: number;
    maxVolumePerTx: string;
  };
}

export interface ValidationContext {
  thresholds: ValidationThresholds;
  logger: Logger;
}
