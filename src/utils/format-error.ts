import { ErrorDetail } from '../types/common';
import { BaseError } from './errors';

/**
 * Formats any error into a consistent structure
 * for logging and error handling
 */
export function formatError(error: unknown): ErrorDetail {
  if (error instanceof BaseError) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      code: error.code
    };
  }
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack
    };
  }
  return {
    message: String(error),
    name: 'UnknownError'
  };
}
