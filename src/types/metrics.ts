import { ValidationResult } from './validation';

export type MetricsSource = 'github' | 'near';

export interface BaseMetrics {
  timestamp: number;
  projectId: string;
  source: MetricsSource;
}

export interface GitHubMetrics extends BaseMetrics {
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

export interface NEARMetrics extends BaseMetrics {
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
    collectionTimestamp: number;
    source: 'near';
    projectId: string;
    periodStart: number;
    periodEnd: number;
  };
}

export interface MetricsMetadata {
  collectionTimestamp: number;
  source: MetricsSource;
  projectId: string;
  periodStart: number;
  periodEnd: number;
}
