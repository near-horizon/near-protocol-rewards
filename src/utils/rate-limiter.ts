/**
 * Rate Limiter Utility
 * 
 * Controls the rate of API requests to prevent hitting rate limits.
 * Implements a token bucket algorithm for rate limiting.
 */

export class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms
  private lastRefillTimestamp: number;

  /**
   * Creates a new rate limiter
   * 
   * @param maxTokens Maximum number of tokens in the bucket
   * @param refillRate Number of tokens to add per second
   */
  constructor(maxTokens: number = 60, refillRate: number = 60) {
    this.tokens = maxTokens;
    this.maxTokens = maxTokens;
    this.refillRate = refillRate / 1000; // Convert to tokens per ms
    this.lastRefillTimestamp = Date.now();
  }

  /**
   * Refills the token bucket based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsedTime = now - this.lastRefillTimestamp;
    
    if (elapsedTime > 0) {
      const newTokens = elapsedTime * this.refillRate;
      this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
      this.lastRefillTimestamp = now;
    }
  }

  /**
   * Acquires a token from the bucket, waiting if necessary
   */
  async acquire(): Promise<void> {
    this.refill();
    
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    
    // Calculate time to wait for next token
    const waitTime = Math.ceil((1 - this.tokens) / this.refillRate);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    this.refill();
    this.tokens -= 1;
  }

  /**
   * Releases a token back to the bucket (used in error handling)
   */
  async release(): Promise<void> {
    this.refill();
    this.tokens = Math.min(this.maxTokens, this.tokens + 1);
  }
} 