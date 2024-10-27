import { ProcessedMetrics, ValidationError } from './index';

/**
 * Event types for SDK event listeners
 */

export interface MetricsCollectedEvent {
  metrics: ProcessedMetrics;
  timestamp: number;
}

export interface ValidationErrorEvent {
  errors: ValidationError[];
  projectId: string;
  timestamp: number;
}

export interface TrackingErrorEvent {
  error: Error;
  projectId: string;
  timestamp: number;
}
