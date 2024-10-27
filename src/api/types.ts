import { ProcessedMetrics } from '../types';
import { JSONValue, ErrorDetail } from '../types/common';

// API Response types
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: APIError;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, JSONValue>;
}

// Metrics response types
export interface MetricsResponse {
  metrics: ProcessedMetrics;
}

export interface ProjectStatusResponse {
  projectId: string;
  status: {
    isActive: boolean;
    lastSync: number;
    hasErrors: boolean;
  };
}

// Request logging types without extending Record
export interface RequestLogContext {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  // Make ip a string or null instead of undefined
  ip: string | null;
  // Allow additional properties
  [key: string]: JSONValue | null;
}
