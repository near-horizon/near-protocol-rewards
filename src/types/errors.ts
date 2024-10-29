import { JSONValue } from './json';

export interface ErrorDetail {
  code: ErrorCode;
  message: string;
  context?: Record<string, JSONValue>;
}

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  COLLECTION_ERROR = 'COLLECTION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  API_ERROR = 'API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  TIMESTAMP_DRIFT = 'TIMESTAMP_DRIFT',
  STALE_DATA = 'STALE_DATA',
  LOW_ACTIVITY_CORRELATION = 'LOW_ACTIVITY_CORRELATION',
  LOW_AUTHOR_DIVERSITY = 'LOW_AUTHOR_DIVERSITY',
  GITHUB_API_ERROR = 'GITHUB_API_ERROR',
  NEAR_API_ERROR = 'NEAR_API_ERROR',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  CALCULATION_ERROR = 'CALCULATION_ERROR'
}

export class BaseError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'BaseError';
  }
}
