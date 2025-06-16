import { BaseCollector } from '../../../src/collectors/base';
import { Logger } from '../../../src/utils/logger';
import { RateLimiter } from '../../../src/utils/rate-limiter';

class TestCollector extends BaseCollector {
  public async testWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    return this.withRateLimit(fn);
  }

  public testError(message: string, context?: Record<string, unknown>): void {
    this.error(message, context);
  }
}

describe('BaseCollector', () => {
  let logger: Logger;
  let rateLimiter: RateLimiter;
  let collector: TestCollector;

  beforeEach(() => {
    logger = {
      error: jest.fn(),
    } as unknown as Logger;

    rateLimiter = {
      acquire: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
    } as unknown as RateLimiter;

    collector = new TestCollector(logger, rateLimiter);
  });

  describe('error', () => {
    it('should log an error message', () => {
      const message = 'Test error message';
      const context = { key: 'value' };

      collector.testError(message, context);

      expect(logger.error).toHaveBeenCalledWith(message, context);
    });

    it('should not throw if logger is undefined', () => {
      collector = new TestCollector(undefined, rateLimiter);

      expect(() => collector.testError('Test error message')).not.toThrow();
    });
  });

  describe('withRateLimit', () => {
    it('should call acquire and release on rateLimiter', async () => {
      const fn = jest.fn().mockResolvedValue('result');

      const result = await collector.testWithRateLimit(fn);

      expect(rateLimiter.acquire).toHaveBeenCalled();
      expect(rateLimiter.release).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    it('should release rateLimiter if fn throws an error', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Test error'));

      await expect(collector.testWithRateLimit(fn)).rejects.toThrow('Test error');
      expect(rateLimiter.acquire).toHaveBeenCalled();
      expect(rateLimiter.release).toHaveBeenCalled();
    });
  });
});