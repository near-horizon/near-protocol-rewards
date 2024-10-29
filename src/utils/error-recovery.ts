import { Logger } from './logger';
import { BaseError, ErrorCode } from '../types/errors';
import { formatError } from './format-error';
import { toJSONValue } from '../types/json';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  logger: Logger;
}

export class ErrorRecovery {
  constructor(private readonly config: RetryConfig) {}

  private isRetryableError(error: unknown): boolean {
    if (error instanceof BaseError) {
      return [
        ErrorCode.RATE_LIMIT,
        ErrorCode.API_ERROR,
        ErrorCode.DATABASE_ERROR
      ].includes(error.code);
    }

    // Network errors
    if (error instanceof Error) {
      const networkErrors = [
        'ECONNRESET',
        'ETIMEDOUT',
        'ECONNREFUSED',
        'NETWORK_ERROR',
        'ENOTFOUND'
      ];
      return networkErrors.some(msg => 
        error.message.toLowerCase().includes(msg.toLowerCase())
      );
    }

    return false;
  }

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
            context: { 
              operation: context, 
              attempt 
            }
          });
          throw error;
        }

        await this.handleRetryableError(error, attempt, context, delay);
        delay = Math.min(delay * 2, this.config.maxDelay);
      }
    }

    throw lastError;
  }

  private async handleRetryableError(
    error: unknown,
    attempt: number,
    context: string,
    delay: number
  ): Promise<void> {
    this.config.logger.warn('Retrying operation', {
      error: toJSONValue(formatError(error)),
      context: {
        operation: context,
        attempt,
        delay,
        nextAttemptIn: delay,
        maxRetries: this.config.maxRetries
      }
    });

    await new Promise(resolve => setTimeout(resolve, delay));
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
