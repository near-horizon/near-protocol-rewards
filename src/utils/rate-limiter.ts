/**
 * Rate limiter configuration and implementation
 * for controlling API request rates
 */

export interface RateLimitConfig {
  requestsPerSecond: number;
  burstSize?: number;
}

export class RateLimiter {
  private timestamps: Map<string, number[]> = new Map();
  
  constructor(private maxRequests: number, private timeWindow: number) {}
  
  canMakeRequest(key: string): boolean {
    const now = Date.now();
    const requests = this.timestamps.get(key) || [];
    
    // Remove old timestamps
    const validRequests = requests.filter(time => now - time < this.timeWindow);
    
    if (validRequests.length < this.maxRequests) {
      validRequests.push(now);
      this.timestamps.set(key, validRequests);
      return true;
    }
    
    return false;
  }
}
