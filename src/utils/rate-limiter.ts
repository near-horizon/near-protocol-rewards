/**
 * Rate limiter configuration and implementation
 * for controlling API request rates
 */

export interface RateLimitConfig {
  requestsPerSecond: number;
  burstSize?: number;
}

export class RateLimiter {
  private lastCheck: number = Date.now();
  private tokens: number;
  private readonly requestsPerSecond: number;
  private readonly burstSize: number;

  constructor(config: RateLimitConfig) {
    this.requestsPerSecond = config.requestsPerSecond;
    this.burstSize = config.burstSize || this.requestsPerSecond;
    this.tokens = this.burstSize;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    const timePassed = (now - this.lastCheck) / 1000;
    this.lastCheck = now;

    // Replenish tokens based on time passed
    this.tokens = Math.min(
      this.burstSize,
      this.tokens + timePassed * this.requestsPerSecond
    );

    if (this.tokens < 1) {
      const waitTime = (1 - this.tokens) * (1000 / this.requestsPerSecond);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.tokens = 1;
    }

    this.tokens -= 1;
  }
}
