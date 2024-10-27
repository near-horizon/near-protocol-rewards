import { Logger } from './logger';
import { BaseError, ErrorCode } from './errors';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  logger: Logger;
}

export class RateLimiter {
  private timestamps: number[] = [];
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly logger: Logger;

  constructor(config: RateLimitConfig) {
    this.windowMs = config.windowMs;
    this.maxRequests = config.maxRequests;
    this.logger = config.logger;
  }

  async checkLimit(): Promise<boolean> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);
    
    if (this.timestamps.length >= this.maxRequests) {
      const oldestTimestamp = this.timestamps[0];
      const waitTime = this.windowMs - (now - oldestTimestamp);
      this.logger.warn('Rate limit reached', { waitTime, windowMs: this.windowMs });
      return false;
    }
    
    this.timestamps.push(now);
    return true;
  }

  async waitForSlot(): Promise<void> {
    while (!(await this.checkLimit())) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
