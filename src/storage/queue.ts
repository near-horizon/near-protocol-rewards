import { ProcessedMetrics } from '../types';

export class MetricsQueue {
  private queue: ProcessedMetrics[] = [];
  private readonly maxQueueSize: number = 1000;
  
  async enqueue(metrics: ProcessedMetrics): Promise<void> {
    if (this.queue.length >= this.maxQueueSize) {
      await this.flushQueue();
    }
    
    this.queue.push(metrics);
  }
  
  private async flushQueue(): Promise<void> {
    // For MVP, just clear the queue
    this.queue = [];
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}
