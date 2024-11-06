import { Logger } from '../types/logger';
import { toErrorContext } from './format-error';
import { BaseError, ErrorCode } from '../types/errors';

export class ErrorRecoveryManager {
  private lastError: Error | null = null;
  private attempts = 0;
  private readonly maxAttempts: number;
  private readonly baseDelay: number;

  constructor(maxAttempts = 3, baseDelay = 1000) {
    this.maxAttempts = maxAttempts;
    this.baseDelay = baseDelay;
  }

  async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    try {
      const result = await operation();
      this.reset();
      return result;
    } catch (error) {
      this.lastError = error as Error;
      this.attempts++;

      if (this.shouldRetry()) {
        const delay = this.getNextAttemptDelay();
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.withRetry(operation);
      }

      throw error;
    }
  }

  private shouldRetry(): boolean {
    return this.attempts < this.maxAttempts;
  }

  private getNextAttemptDelay(): number {
    return this.baseDelay * Math.pow(2, this.attempts - 1);
  }

  private reset(): void {
    this.lastError = null;
    this.attempts = 0;
  }
}
