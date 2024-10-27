import { BaseError, ErrorCode } from '../utils/errors';
import { Logger } from '../utils/logger';
import { RateLimiter } from '../utils/rate-limiter';

export abstract class BaseCollector {
  protected readonly logger: Logger;
  protected readonly rateLimiter: RateLimiter;
  protected readonly batchSize: number = 50;
  protected readonly retryAttempts = 3;
  protected readonly retryDelay = 1000; // ms
  
  constructor(logger: Logger, rateLimit: number, rateInterval: number) {
    this.logger = logger;
    this.rateLimiter = new RateLimiter(rateLimit, rateInterval);
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
        await this.rateLimiter.waitForLimit();
        return await operation();
      } catch (error: any) {
        lastError = error;
        this.logger.warn(`${context} failed, attempt ${attempt}/${this.retryAttempts}`, { error });
        
        if (attempt < this.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }

    throw new BaseError(
      `${context} failed after ${this.retryAttempts} attempts`,
      ErrorCode.COLLECTION_ERROR,
      { originalError: lastError }
    );
  }
}
