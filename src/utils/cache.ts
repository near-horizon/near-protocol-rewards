import { Redis } from 'ioredis';
import { Logger } from './logger';
import { StorageError, ErrorCode } from './errors';

interface CacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  logger: Logger;
  defaultTTL?: number;
}

export class Cache {
  private client: Redis;
  private readonly defaultTTL: number;
  private readonly logger: Logger;

  constructor(config: CacheConfig) {
    this.client = new Redis(config.redis);
    this.logger = config.logger;
    this.defaultTTL = config.defaultTTL || 300; // 5 minutes default

    this.client.on('error', (error) => {
      this.logger.error('Redis cache error', { error });
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      throw new StorageError(
        'Failed to retrieve from cache',
        ErrorCode.CACHE_ERROR,
        { key, error }
      );
    }
  }

  async set(key: string, value: any, ttl = this.defaultTTL): Promise<void> {
    try {
      await this.client.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      throw new StorageError(
        'Failed to store in cache',
        ErrorCode.CACHE_ERROR,
        { key, error }
      );
    }
  }

  async invalidate(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      throw new StorageError(
        'Failed to invalidate cache',
        ErrorCode.CACHE_ERROR,
        { key, error }
      );
    }
  }
}
