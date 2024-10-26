import { Logger } from './logger';

export enum ErrorCode {
  // Collection Errors
  GITHUB_API_ERROR = 'GITHUB_API_ERROR',
  NEAR_API_ERROR = 'NEAR_API_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  COLLECTION_ERROR = 'COLLECTION_ERROR',
  
  // Validation Errors
  INVALID_DATA_FORMAT = 'INVALID_DATA_FORMAT',
  STALE_DATA = 'STALE_DATA',
  LOW_COMMIT_COUNT = 'LOW_COMMIT_COUNT',
  SUSPICIOUS_COMMIT_FREQUENCY = 'SUSPICIOUS_COMMIT_FREQUENCY',
  LOW_AUTHOR_DIVERSITY = 'LOW_AUTHOR_DIVERSITY',
  SINGLE_PR_AUTHOR = 'SINGLE_PR_AUTHOR',
  LOW_ISSUE_ENGAGEMENT = 'LOW_ISSUE_ENGAGEMENT',
  LOW_TRANSACTION_COUNT = 'LOW_TRANSACTION_COUNT',
  SUSPICIOUS_TRANSACTION_FREQUENCY = 'SUSPICIOUS_TRANSACTION_FREQUENCY',
  HIGH_AVERAGE_VOLUME = 'HIGH_AVERAGE_VOLUME',
  LOW_USER_DIVERSITY = 'LOW_USER_DIVERSITY',
  LOW_CONTRACT_USAGE = 'LOW_CONTRACT_USAGE',
  SINGLE_CONTRACT_CALLER = 'SINGLE_CONTRACT_CALLER',
  MISSING_BLOCK_HEIGHT = 'MISSING_BLOCK_HEIGHT',
  TIMESTAMP_DRIFT = 'TIMESTAMP_DRIFT',
  LOW_ACTIVITY_CORRELATION = 'LOW_ACTIVITY_CORRELATION',
  
  // Storage Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  
  // Security Errors
  ENCRYPTION_ERROR = 'ENCRYPTION_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  
  // API Errors
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export class BaseError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class APIError extends BaseError {}
export class ValidationError extends BaseError {}
export class StorageError extends BaseError {}
export class SecurityError extends BaseError {}
export class CollectionError extends BaseError {}

export class ErrorHandler {
  constructor(private readonly logger: Logger) {}

  handle(error: Error, context?: Record<string, any>): void {
    if (error instanceof BaseError) {
      this.logger.error(`${error.code}: ${error.message}`, {
        ...error.context,
        ...context
      });
    } else {
      this.logger.error(error.message, context);
    }
  }
}

export class SDKError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'SDKError';
  }
}
