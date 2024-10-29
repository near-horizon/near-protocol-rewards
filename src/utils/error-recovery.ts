import { Logger } from './logger';
import { BaseError, ErrorCode } from '../types/errors';
import { formatError } from './format-error';
import { LogContext, JSONValue } from '../types/common';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  logger: Logger;
}

export class ErrorRecovery {
  constructor(private readonly config: RetryConfig) {}

  async withRetry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = this.config.baseDelay;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (!this.isRetryableError(error)) {
          this.config.logger.error('Non-retryable error encountered', {
            error: formatError(error),
            context: { operation: context, attempt }
          });
          throw error;
        }

        if (attempt === this.config.maxRetries) {
          break;
        }

        this.config.logger.warn('Retrying operation', {
            error: formatError(error),
            context: { operation: context, attempt, delay }
        });

        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, this.config.maxDelay);
      }
    }

    throw new BaseError(
      `Operation failed after ${this.config.maxRetries} retries`,
      ErrorCode.PROCESSING_ERROR,
      { 
        context, 
        lastError: formatError(lastError),
        attempts: this.config.maxRetries 
      }
    );
  }

  private isRetryableError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const err = error as { code?: string; status?: number; message?: string };

    // Network errors
    if (err.code === 'ECONNRESET' || 
        err.code === 'ETIMEDOUT' || 
        err.code === 'ECONNREFUSED') {
      return true;
    }

    // Rate limiting
    if (err.status === 429) {
      return true;
    }

    // Server errors
    if (err.status && err.status >= 500 && err.status < 600) {
      return true;
    }

    // Specific API errors that are retryable
    const retryableMessages = [
      'rate limit',
      'timeout',
      'temporarily unavailable'
    ];

    return typeof err.message === 'string' && 
      retryableMessages.some(msg => err.message!.toLowerCase().includes(msg));
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  
  throw lastError;
}
