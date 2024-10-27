import { BaseError, ErrorCode } from '../utils/errors';
import { Logger } from '../utils/logger';
import { RateLimiter, RateLimitConfig } from '../utils/rate-limiter';
import { formatError } from '../utils/format-error';
import { JSONValue } from '../types/common';

export interface CollectorConfig {
  logger: Logger;
  maxRequestsPerSecond?: number;
}

export class BaseCollector {
  protected readonly logger: Logger;
  protected readonly rateLimiter: RateLimiter;
  protected readonly retryAttempts = 3;
  protected readonly batchSize: number = 50;
  protected readonly retryDelay = 1000; // ms

  constructor(config: CollectorConfig) {
    this.logger = config.logger;
    this.rateLimiter = new RateLimiter({
      requestsPerSecond: config.maxRequestsPerSecond || 1
    });
  }

  // Add performance monitoring
  protected async measureCollectionPerformance<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    const result = await operation();
    const duration = performance.now() - start;
    
    this.logger.debug('Collection performance', {
      duration,
      operation: operation.name
    });
    
    return result;
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        await this.rateLimiter.wait();
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt === this.retryAttempts) break;
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw new BaseError(
      `${context} failed after ${this.retryAttempts} attempts`,
      ErrorCode.COLLECTION_ERROR,
      { error: formatError(lastError) }
    );
  }

  protected async withRateLimit<T>(operation: () => Promise<T>): Promise<T> {
    await this.rateLimiter.wait();  // Changed from acquire to wait
    return operation();
  }
}
