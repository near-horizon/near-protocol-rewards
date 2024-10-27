import { Logger } from './logger';

export enum ErrorCode {
  // API Errors
  GITHUB_API_ERROR = 'GITHUB_API_ERROR',
  NEAR_API_ERROR = 'NEAR_API_ERROR',
  API_ERROR = 'API_ERROR',
  
  // Processing Errors
  AGGREGATION_ERROR = 'AGGREGATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  COLLECTION_ERROR = 'COLLECTION_ERROR',
  CALCULATION_ERROR = 'CALCULATION_ERROR',
  PRICE_DATA_ERROR = 'PRICE_DATA_ERROR',
  
  // Security Errors
  TAMPERING_DETECTED = 'TAMPERING_DETECTED',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // Storage Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  
  // General Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_FOUND = 'NOT_FOUND'
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
