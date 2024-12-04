import { JSONValue } from './json';

export const ErrorCode = {
  SDK_ERROR: 'SDK_ERROR',
  API_ERROR: 'API_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  CALCULATION_ERROR: 'CALCULATION_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  COLLECTION_ERROR: 'COLLECTION_ERROR',
  INVALID_CONFIG: 'INVALID_CONFIG',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  LOW_COMMIT_COUNT: 'LOW_COMMIT_COUNT',
  SUSPICIOUS_COMMIT_FREQUENCY: 'SUSPICIOUS_COMMIT_FREQUENCY',
  LOW_AUTHOR_DIVERSITY: 'LOW_AUTHOR_DIVERSITY',
  HIGH_VELOCITY: 'HIGH_VELOCITY',
  SINGLE_PR_AUTHOR: 'SINGLE_PR_AUTHOR',
  LOW_PR_MERGE_RATE: 'LOW_PR_MERGE_RATE',
  LOW_REVIEW_ENGAGEMENT: 'LOW_REVIEW_ENGAGEMENT',
  LOW_ISSUE_ENGAGEMENT: 'LOW_ISSUE_ENGAGEMENT',
  LOW_ISSUE_RESOLUTION_RATE: 'LOW_ISSUE_RESOLUTION_RATE',
  MISSING_TIMESTAMP: 'MISSING_TIMESTAMP',
  STALE_DATA: 'STALE_DATA'
} as const;

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];

export class BaseError extends Error {
  public context?: Record<string, unknown>;

  constructor(
    message: string,
    public code: ErrorCode,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.context = details;
  }
}

export interface ErrorDetail {
  code: ErrorCode;
  message: string;
  context?: Record<string, unknown>;
}

export function formatError(error: unknown): ErrorDetail {
  if (error instanceof Error) {
    return {
      code: ErrorCode.PROCESSING_ERROR,
      message: error.message,
      context: { stack: error.stack }
    };
  }
  return {
    code: ErrorCode.PROCESSING_ERROR,
    message: String(error)
  };
}
