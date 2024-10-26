import { Redis } from 'ioredis';
import { Logger } from './logger';
import { APIError, ErrorCode } from './errors';

interface RateLimiterConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  logger: Logger;
  limits: {
    github?: {
      requests: number;
      window: number;
    };
    near?: {
      requests: number;
      window: number;
    };
  };
}

export class RateLimiter {
  private client: Redis;
  private readonly logger: Logger;
  private readonly limits: RateLimiterConfig['limits'];

  constructor(config: RateLimiterConfig) {
    this.client = new Redis(config.redis);
    this.logger = config.logger;
    this.limits = config.limits;
  }

  async checkLimit(key: string, type: 'github' | 'near'): Promise<boolean> {
    const limit = this.limits[type];
    if (!limit) return true;

    const current = await this.getCurrentCount(key);
    return current < limit.requests;
  }

  async incrementCount(key: string, type: 'github' | 'near'): Promise<void> {
    const limit = this.limits[type];
    if (!limit) return;

    const multi = this.client.multi();
    multi.incr(key);
    multi.expire(key, limit.window);
    await multi.exec();
  }

  private async getCurrentCount(key: string): Promise<number> {
    const count = await this.client.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: {
      key: string;
      type: 'github' | 'near';
      maxRetries?: number;
      backoff?: number;
    }
  ): Promise<T> {
    const { key, type, maxRetries = 3, backoff = 1000 } = options;
    let retries = 0;

    while (retries <= maxRetries) {
      try {
        if (await this.checkLimit(key, type)) {
          await this.incrementCount(key, type);
          return await operation();
        }

        const waitTime = Math.min(backoff * Math.pow(2, retries), 60000);
        this.logger.warn(`Rate limit reached, waiting ${waitTime}ms`, {
          key,
          type,
          retries
        });

        await new Promise(resolve => setTimeout(resolve, waitTime));
        retries++;
      } catch (error) {
        if (retries === maxRetries) {
          throw new APIError(
            'Rate limit exceeded after retries',
            ErrorCode.RATE_LIMIT_EXCEEDED,
            { key, type, retries }
          );
        }
        retries++;
      }
    }

    throw new APIError(
      'Rate limit exceeded',
      ErrorCode.RATE_LIMIT_EXCEEDED,
      { key, type }
    );
  }
}
