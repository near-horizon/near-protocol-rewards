import { Logger } from "../utils/logger";
import { RateLimiter } from "../utils/rate-limiter";

export abstract class BaseCollector {
  protected readonly logger?: Logger;
  protected readonly rateLimiter?: RateLimiter;

  constructor(logger?: Logger, rateLimiter?: RateLimiter) {
    this.logger = logger;
    this.rateLimiter = rateLimiter;
  }

  protected error(message: string, context?: Record<string, unknown>): void {
    this.logger?.error(message, context);
  }

  protected async withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    try {
      await this.rateLimiter?.acquire();
      const result = await fn();
      await this.rateLimiter?.release();
      return result;
    } catch (error) {
      await this.rateLimiter?.release();
      throw error;
    }
  }
}

export interface ICollector {
  name: string;
  collect(walletId: string): Promise<ICollectorResult>;
}

export interface ICollectorResult {
  success: boolean;
  data?: any;
  error?: string;
}
