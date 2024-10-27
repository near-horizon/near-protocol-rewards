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
  private timestamps: number[] = [];
  private readonly limit: number;
  private readonly interval: number;

  constructor(limit: number, interval: number) {
    this.limit = limit;
    this.interval = interval;
  }

  async checkLimit(): Promise<boolean> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => now - t < this.interval);
    
    if (this.timestamps.length >= this.limit) {
      return false;
    }
    
    this.timestamps.push(now);
    return true;
  }

  async waitForLimit(): Promise<void> {
    while (!(await this.checkLimit())) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
