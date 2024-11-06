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
  UNAUTHORIZED: 'UNAUTHORIZED'
} as const;

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];

export class BaseError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: Record<string, unknown>
  ) {
    super(message);
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
