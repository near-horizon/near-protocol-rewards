import { ErrorDetail, ErrorCode } from '../types/errors';

/**
 * Formats any error into a consistent structure
 * for logging and error handling
 */
export function formatError(error: unknown): ErrorDetail {
  if (error instanceof Error) {
    return {
      code: ErrorCode.PROCESSING_ERROR,
      message: error.message,
      context: {
        name: error.constructor.name,
        stack: error.stack || null
      }
    };
  }

  return {
    code: ErrorCode.PROCESSING_ERROR,
    message: typeof error === 'string' ? error : 'Unknown error',
    context: {
      type: typeof error,
      value: String(error)
    }
  };
}
