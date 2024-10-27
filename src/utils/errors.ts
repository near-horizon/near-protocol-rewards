import { Logger } from './logger';
import { formatError } from './format-error';
import { JSONValue } from '../types/common';

export enum ErrorCode {
  // API Errors
  GITHUB_API_ERROR = 'GITHUB_API_ERROR',
  NEAR_API_ERROR = 'NEAR_API_ERROR',
  API_ERROR = 'API_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  
  // Collection Errors
  COLLECTION_ERROR = 'COLLECTION_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  
  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TIMESTAMP_DRIFT = 'TIMESTAMP_DRIFT',
  STALE_DATA = 'STALE_DATA',
  USER_COUNT_DISCREPANCY = 'USER_COUNT_DISCREPANCY',
  LOW_ACTIVITY_CORRELATION = 'LOW_ACTIVITY_CORRELATION',
  
  // Security Errors
  ENCRYPTION_ERROR = 'ENCRYPTION_ERROR',
  DECRYPTION_ERROR = 'DECRYPTION_ERROR',
  TAMPERING_DETECTED = 'TAMPERING_DETECTED',
  KEY_ROTATION_ERROR = 'KEY_ROTATION_ERROR',
  
  // Storage Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  AGGREGATION_ERROR = 'AGGREGATION_ERROR',

  // GitHub Metrics Validation Errors
  LOW_COMMIT_COUNT = 'LOW_COMMIT_COUNT',
  SUSPICIOUS_COMMIT_FREQUENCY = 'SUSPICIOUS_COMMIT_FREQUENCY', 
  LOW_AUTHOR_DIVERSITY = 'LOW_AUTHOR_DIVERSITY',
  SINGLE_PR_AUTHOR = 'SINGLE_PR_AUTHOR',
  LOW_PR_MERGE_RATE = 'LOW_PR_MERGE_RATE',
  LOW_ISSUE_ENGAGEMENT = 'LOW_ISSUE_ENGAGEMENT',
  LOW_ISSUE_RESOLUTION_RATE = 'LOW_ISSUE_RESOLUTION_RATE',
  MISSING_TIMESTAMP = 'MISSING_TIMESTAMP'
}

export class BaseError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly context?: Record<string, JSONValue>
  ) {
    super(message);
    this.name = 'BaseError';
  }
}

export class APIError extends BaseError {}
export class ValidationError extends BaseError {}
export class StorageError extends BaseError {}
export class SecurityError extends BaseError {}

export class ErrorHandler {
  constructor(private readonly logger: Logger) {}

  handle(error: Error, context?: Record<string, JSONValue>): void {
    const errorDetail = formatError(error);
    
    if (error instanceof BaseError) {
      this.logger.error(error.message, {
        error: errorDetail,
        context: error.context || context
      });
    } else {
      this.logger.error(error.message, {
        error: errorDetail,
        context
      });
    }
  }
}

export class SDKError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly context?: Record<string, JSONValue>
  ) {
    super(message);
    this.name = 'SDKError';
  }
}
