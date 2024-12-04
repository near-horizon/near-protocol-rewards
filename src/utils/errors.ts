import { ErrorCode } from '../types/errors';
import { BaseError } from '../types/errors';
import { ErrorDetail } from '../types/errors';
import { formatError } from '../types/errors';
import { Logger } from './logger';
import { JSONValue } from '../types/json';

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

export class SDKError extends BaseError {
  constructor(
    message: string,
    code: ErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message, code, details);
    this.name = 'SDKError';
  }
}

// Re-export error types
export { ErrorCode, BaseError, ErrorDetail, formatError };
