export enum ErrorCode {
  // API Errors
  GITHUB_API_ERROR = 'GITHUB_API_ERROR',
  NEAR_API_ERROR = 'NEAR_API_ERROR',
  
  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  LOW_ACTIVITY_CORRELATION = 'LOW_ACTIVITY_CORRELATION',
  USER_COUNT_DISCREPANCY = 'USER_COUNT_DISCREPANCY',
  TIMESTAMP_DRIFT = 'TIMESTAMP_DRIFT',
  STALE_DATA = 'STALE_DATA',
  
  // Processing Errors
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  AGGREGATION_ERROR = 'AGGREGATION_ERROR',
  TRANSFORMATION_ERROR = 'TRANSFORMATION_ERROR',
  
  // Storage Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR'
}

export class BaseError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'BaseError';
  }
}
