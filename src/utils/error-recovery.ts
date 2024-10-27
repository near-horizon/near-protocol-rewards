import { Logger } from './logger';
import { BaseError, ErrorCode } from './errors';

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
            error,
            context,
            attempt
          });
          throw error;
        }

        if (attempt === this.config.maxRetries) {
          break;
        }

        this.config.logger.warn('Retrying operation', {
          error,
          context,
          attempt,
          delay
        });

        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, this.config.maxDelay);
      }
    }

    throw new BaseError(
      `Operation failed after ${this.config.maxRetries} retries`,
      ErrorCode.RETRY_EXHAUSTED,
      { context, lastError }
    );
  }

  private isRetryableError(error: any): boolean {
    // Network errors
    if (error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ECONNREFUSED') {
      return true;
    }

    // Rate limiting
    if (error.status === 429) {
      return true;
    }

    // Server errors
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // Specific API errors that are retryable
    const retryableMessages = [
      'rate limit',
      'timeout',
      'temporarily unavailable'
    ];

    return retryableMessages.some(msg => 
      error.message?.toLowerCase().includes(msg)
    );
  }
}
