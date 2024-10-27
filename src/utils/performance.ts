import { Logger } from './logger';
import { MetricsCache } from '../cache/metrics-cache';

interface PerformanceConfig {
  logger: Logger;
  cache: MetricsCache;
  batchSize?: number;
  maxConcurrent?: number;
}

export class PerformanceOptimizer {
  private readonly logger: Logger;
  private readonly cache: MetricsCache;
  private readonly batchSize: number;
  private readonly maxConcurrent: number;
  private readonly metrics: Map<string, number[]> = new Map();

  constructor(config: PerformanceConfig) {
    this.logger = config.logger;
    this.cache = config.cache;
    this.batchSize = config.batchSize || 100;
    this.maxConcurrent = config.maxConcurrent || 5;
  }

  async batchProcess<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = [];
    
    // Process in batches
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      const batchResults = await Promise.all(
        batch.map(item => this.processWithRetry(item, processor))
      );
      results.push(...batchResults);
    }

    return results;
  }

  private async processWithRetry<T, R>(
    item: T,
    processor: (item: T) => Promise<R>,
    attempts = 3
  ): Promise<R> {
    try {
      const startTime = performance.now();
      const result = await processor(item);
      this.recordMetric('processing_time', performance.now() - startTime);
      return result;
    } catch (error) {
      if (attempts > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.processWithRetry(item, processor, attempts - 1);
      }
      throw error;
    }
  }

  private recordMetric(name: string, value: number): void {
    const metrics = this.metrics.get(name) || [];
    metrics.push(value);
    this.metrics.set(name, metrics.slice(-1000)); // Keep last 1000 measurements
  }

  getMetrics(): Record<string, { avg: number; p95: number; p99: number }> {
    const result: Record<string, { avg: number; p95: number; p99: number }> = {};

    for (const [name, values] of this.metrics.entries()) {
      const sorted = [...values].sort((a, b) => a - b);
      result[name] = {
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)]
      };
    }

    return result;
  }
}

export class PerformanceMonitor {
  constructor(private readonly logger: Logger) {}

  // ... rest of implementation ...
}
