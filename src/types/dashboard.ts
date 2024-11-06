import { GitHubMetrics, NEARMetrics } from './metrics';
import { ValidationResult } from './validation';
import { TelemetryEvent } from '../utils/telemetry';

export interface TimeRange {
  start: Date;
  end: Date;
}

// Public-facing metrics
export interface DashboardMetrics {
  github: GitHubMetrics;
  near: NEARMetrics;
  validation: ValidationResult;
}

// Internal monitoring metrics
export interface InternalMetrics {
  totalInitializations: number;
  metricsCollected: number;
  rewardsCalculated: number;
  errors: number;
  averageScore: number;
  errorBreakdown: Record<string, number>;
}

// Activity feed types
export interface ActivityItem {
  id: string;
  type: 'commit' | 'transaction' | 'reward';
  title: string;
  timestamp: string;
  details: string;
}

// Integration status types
export interface IntegrationStatus {
  name: string;
  status: 'connected' | 'pending' | 'error';
  lastSync?: string;
  error?: string;
} 