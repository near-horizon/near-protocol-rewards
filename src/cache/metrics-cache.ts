import NodeCache from 'node-cache';
import { Logger } from '../utils/logger';
import { ProcessedMetrics } from '../types';
import { SDKError } from '../utils/errors';

interface CacheConfig {
  ttl?: number; // Time to live in seconds
  checkPeriod?: number; // How often to check for expired keys
}

export class MetricsCache {
  private cache: NodeCache;
  private readonly logger: Logger;

  constructor(logger: Logger, config: CacheConfig = {}) {
    this.logger = logger;
    this.cache = new NodeCache({
      stdTTL: config.ttl || 300, // 5 minutes default
      checkperiod: config.checkPeriod || 60 // 1 minute default
    });
  }

  async get(key: string): Promise<ProcessedMetrics | null> {
    try {
      const data = this.cache.get<ProcessedMetrics>(key);
      return data || null;
    } catch (error) {
      this.logger.error('Cache get error', { error, key });
      throw new SDKError('Cache get failed', 'CACHE_ERROR', { error });
    }
  }

  async set(key: string, value: ProcessedMetrics): Promise<void> {
    try {
      this.cache.set(key, value);
    } catch (error) {
      this.logger.error('Cache set error', { error, key });
      throw new SDKError('Cache set failed', 'CACHE_ERROR', { error });
    }
  }

  async invalidate(key: string): Promise<void> {
    try {
      this.cache.del(key);
    } catch (error) {
      this.logger.error('Cache invalidation error', { error, key });
      throw new SDKError('Cache invalidation failed', 'CACHE_ERROR', { error });
    }
  }
}
