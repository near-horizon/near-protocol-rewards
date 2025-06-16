/**
 * Base collector class
 * 
 * Provides common functionality for all collectors
 */

import { Logger } from "../utils/logger";
import { RateLimiter } from "../utils/rate-limiter";

export abstract class BaseCollector {
  protected readonly logger?: Logger;
  protected readonly rateLimiter?: RateLimiter;

  constructor(logger?: Logger, rateLimiter?: RateLimiter) {
    this.logger = logger;
    this.rateLimiter = rateLimiter;
  }

  protected log(message: string, context?: Record<string, unknown>): void {
    this.logger?.info(message, context);
  }

  protected error(message: string, context?: Record<string, unknown>): void {
    this.logger?.error(message, context);
  }

  protected async withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    try {
      await this.rateLimiter?.acquire();
      const result = await fn();
      return result;
    } catch (error) {
      await this.rateLimiter?.release();
      throw error;
    } finally {
      // We don't release in the success case because we want to respect the rate limit
      // The token bucket will refill naturally over time
    }
  }

  abstract collectData(...args: any[]): Promise<unknown>;
} 