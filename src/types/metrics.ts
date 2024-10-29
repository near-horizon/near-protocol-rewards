import { ValidationError, ValidationWarning } from './validation';

// Export interfaces
export type MetricsSource = 'github' | 'near' | 'sdk';
export type ValidationType = 'data' | 'cross' | 'security';

export interface MetricsMetadata {
  collectionTimestamp: number;
  source: MetricsSource;
  projectId: string;
  periodStart: number;
  periodEnd: number;
}

export interface ValidationMetadata {
  source: MetricsSource;
  validationType: ValidationType;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    code: string;
    message: string;
  }>;
  warnings: Array<{
    code: string;
    message: string;
  }>;
  timestamp: number;
  metadata: ValidationMetadata;
}

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
  metadata: MetricsMetadata;
}

export interface NEARMetrics {
  timestamp: number;
  projectId: string;
  contractCalls: {
    count: number;
    uniqueCallers: string[];
  };
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
    priceData?: {
      usd: number;
      timestamp: number;
    };
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
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    timestamp: number;
    metadata: {
      source: MetricsSource;
      validationType: ValidationType;
    };
  };
  metadata: MetricsMetadata;
}

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
