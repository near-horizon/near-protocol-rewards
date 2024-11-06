/**
 * Rate limiter configuration and implementation
 * for controlling API request rates
 */

interface RateLimiterConfig {
  maxRequests: number;
  timeWindowMs: number;
  retryAfterMs: number;
}

export class RateLimiter {
  private requests: number[] = [];
  private readonly config: RateLimiterConfig;

  constructor(config: RateLimiterConfig) {
    this.config = config;
  }

  async checkAndWait(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => 
      time > now - this.config.timeWindowMs
    );

    if (this.requests.length >= this.config.maxRequests) {
      await new Promise(resolve => 
        setTimeout(resolve, this.config.retryAfterMs)
      );
      return this.checkAndWait();
    }

    this.requests.push(now);
  }
}
