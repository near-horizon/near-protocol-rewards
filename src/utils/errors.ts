import { Logger } from './logger';
import { formatError } from './format-error';
import { JSONValue } from '../types/common';

export const enum ErrorCode {
  SDK_ERROR = 'SDK_ERROR',
  API_ERROR = 'API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  COLLECTION_ERROR = 'COLLECTION_ERROR',
  CALCULATION_ERROR = 'CALCULATION_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  TIMESTAMP_DRIFT = 'TIMESTAMP_DRIFT',
  USER_COUNT_DISCREPANCY = 'USER_COUNT_DISCREPANCY'
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
        context: error.details || context
      });
    } else {
      this.logger.error(error.message, {
        error: errorDetail,
        context
      });
    }
  }
}

export class SDKError extends BaseError {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: Record<string, unknown>
  ) {
    super(message, code, details);
    this.name = 'SDKError';
  }
}
