/**
 * Core Type Definitions
 * 
 * Contains all shared types used throughout the SDK.
 * Maintains type safety and consistency across components.
 * 
 * Key type hierarchies:
 * - Metrics (GitHub)
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
export type MetricsSource = 'github';
export type ValidationType = 'data' | 'security' | 'config';

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
  github: {
    minCommits?: number;
    maxCommitsPerDay?: number;
    minAuthors?: number;
  };
  maxTimeDrift?: number;
  maxDataAge?: number;
}

// SDK Configuration Schema
export const SDKConfigSchema = z.object({
  githubRepo: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
  githubToken: z.string().min(1),
  timeframe: z.enum(['day', 'week', 'month']).optional(),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  maxRequestsPerSecond: z.number().positive().optional(),
  validation: z.object({
    github: z.object({
      minCommits: z.number().positive(),
      maxCommitsPerDay: z.number().positive(),
      minAuthors: z.number().positive()
    }).optional()
  }).optional(),
  weights: z.object({
    commits: z.number(),
    pullRequests: z.number(),
    reviews: z.number(),
    issues: z.number()
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

// Re-export from other type files
export {
  JSONValue,
  ErrorDetail
} from './json';

// Explicitly re-export validation types to avoid conflicts
export {
  ValidationError,
  ValidationWarning,
  ValidationResult,
  ValidationMetadata
} from './validation';

// Export metrics types
export {
  GitHubMetrics,
  ProcessedMetrics,
  MetricsMetadata,
  Score,
  RewardCalculation
} from './metrics';

// Export error codes
export { ErrorCode } from './errors';

// Export logger types
export { LogContext, ErrorLogContext } from './logger';

// Export core types
export * from './json';
export * from './errors';
export * from './logger';
export * from './sdk';

// Export additional types
export interface ValidationThresholds {
  github: {
    minCommits: number;
    maxCommitsPerDay: number;
    minAuthors: number;
  };
}

export interface ValidationContext {
  thresholds: ValidationThresholds;
  logger: Logger;
}
