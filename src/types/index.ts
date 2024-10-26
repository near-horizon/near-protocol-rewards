import { z } from 'zod';
import { SDKConfigSchema } from '../validators/schema';

// Export the SDK configuration type
export type SDKConfig = z.infer<typeof SDKConfigSchema>;

// Metrics types
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
    repo: string;
    collectionTimestamp: number;
  };
}

export interface NEARMetrics {
  transactions: {
    count: number;
    volume: string;
    uniqueUsers: string[];
    timestamp: number;
  };
  contract: {
    calls: number;
    uniqueCallers: string[];
    timestamp: number;
  };
  metadata: {
    account: string;
    collectionTimestamp: number;
    blockHeight: number;
  };
}

export interface ProcessedMetrics {
  timestamp: number;
  github: GitHubMetrics;
  near: NEARMetrics;
  validation: ValidationResult;
  score: {
    total: number;
    breakdown: {
      github: number;
      near: number;
    };
  };
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

export interface SDKConfig {
  projectId: string;
  nearAccount: string;
  githubRepo: string;
  githubToken: string;
  nearApiEndpoint?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  trackingInterval?: number;
  validation?: ValidationConfig;
  storage?: StorageConfig;
  weights?: WeightConfig;
  logger?: Logger;
}

export interface StorageSchema {
  metrics: ProcessedMetrics;
  validations: ValidationResult[];
  projects: {
    id: string;
    nearAccount: string;
    githubRepo: string;
    createdAt: number;
    updatedAt: number;
  };
}

// Event types
export type SDKEventMap = {
  'error': SDKError;
  'metrics:collected': ProcessedMetrics;
  'validation:failed': ValidationError[];
  'tracking:started': void;
  'tracking:stopped': void;
  'collection:failed': Error;
};

export interface SDKError extends Error {
  code: string;
  context?: Record<string, any>;
}

export interface AggregatedMetrics {
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
  metadata: {
    projectId: string;
    calculationTimestamp: number;
    periodStart: number;
    periodEnd: number;
  };
}
