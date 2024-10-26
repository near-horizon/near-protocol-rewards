export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private readonly logger: Logger;
  private readonly metricsRetention = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor(logger: Logger) {
    this.logger = logger;
  }

  startOperation(name: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
    };
  }

  recordMetric(name: string, value: number): void {
    const metrics = this.metrics.get(name) || [];
    metrics.push(value);
    
    // Cleanup old metrics
    const cutoff = Date.now() - this.metricsRetention;
    const filtered = metrics.filter(m => m.timestamp > cutoff);
    this.metrics.set(name, filtered);
  }
}
