/**
 * Rate limiter configuration and implementation
 * for controlling API request rates
 */

export interface RateLimiterConfig {
  maxRequestsPerSecond: number;
  timeWindowMs?: number;
  retryAfterMs?: number;
}

export class RateLimiter {
  private readonly maxRequests: number;
  private readonly timeWindow: number;
  private readonly retryAfter: number;
  private requests: number = 0;
  private lastReset: number = Date.now();

  constructor(config: RateLimiterConfig) {
    this.maxRequests = config.maxRequestsPerSecond;
    this.timeWindow = config.timeWindowMs || 1000;
    this.retryAfter = config.retryAfterMs || 1000;
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    if (now - this.lastReset >= this.timeWindow) {
      this.requests = 0;
      this.lastReset = now;
    }

    if (this.requests >= this.maxRequests) {
      await new Promise((resolve) => setTimeout(resolve, this.retryAfter));
      return this.acquire();
    }

    this.requests++;
  }

  async release(): Promise<void> {
    if (this.requests > 0) {
      this.requests--;
    }
  }
}
