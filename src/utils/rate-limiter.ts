/**
 * Rate limiter configuration and implementation
 * for controlling API request rates
 */

export interface RateLimitConfig {
  requestsPerSecond: number;
  burstSize?: number;
}

export class RateLimiter {
  private lastRequest: number = 0;
  private requestCount: number = 0;

  constructor(private config: { requestsPerSecond: number }) {
    this.config.requestsPerSecond = config.requestsPerSecond || 1;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    const timeWindow = 1000; // 1 second in milliseconds
    
    if (now - this.lastRequest < timeWindow) {
      this.requestCount++;
      if (this.requestCount >= this.config.requestsPerSecond) {
        const delay = timeWindow - (now - this.lastRequest);
        await new Promise(resolve => setTimeout(resolve, delay));
        this.requestCount = 0;
        this.lastRequest = Date.now();
      }
    } else {
      this.requestCount = 1;
      this.lastRequest = now;
    }
  }
}
