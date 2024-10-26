import { GitHubMetrics, NEARMetrics, ProcessedMetrics } from '../types';
import { Logger } from '../utils/logger';
import { PostgresStorage } from '../storage/postgres';

interface AnalyzerConfig {
  logger: Logger;
  storage: PostgresStorage;
  windowSize?: number; // Days to analyze
}

export class HistoricalAnalyzer {
  private readonly logger: Logger;
  private readonly storage: PostgresStorage;
  private readonly windowSize: number;

  constructor(config: AnalyzerConfig) {
    this.logger = config.logger;
    this.storage = config.storage;
    this.windowSize = config.windowSize || 30; // Default 30 days
  }

  async analyzeMetrics(projectId: string): Promise<{
    trends: MetricsTrends;
    predictions: MetricsPredictions;
    anomalies: MetricsAnomalies;
  }> {
    const endTime = Date.now();
    const startTime = endTime - (this.windowSize * 24 * 60 * 60 * 1000);
    
    const history = await this.storage.getMetricsHistory(
      projectId,
      startTime,
      endTime
    );

    return {
      trends: this.analyzeTrends(history),
      predictions: this.makePredictions(history),
      anomalies: this.detectAnomalies(history)
    };
  }

  private analyzeTrends(metrics: ProcessedMetrics[]): MetricsTrends {
    const github = this.analyzeGitHubTrends(metrics.map(m => m.github));
    const near = this.analyzeNEARTrends(metrics.map(m => m.near));

    return {
      github,
      near,
      correlation: this.calculateCorrelation(github, near)
    };
  }

  private analyzeGitHubTrends(metrics: GitHubMetrics[]): GitHubTrends {
    const commitTrend = this.calculateTrend(
      metrics.map(m => m.commits.count)
    );
    const prTrend = this.calculateTrend(
      metrics.map(m => m.pullRequests.merged)
    );
    const authorGrowth = this.calculateGrowth(
      metrics.map(m => m.commits.authors.length)
    );

    return {
      commitTrend,
      prTrend,
      authorGrowth
    };
  }

  private analyzeNEARTrends(metrics: NEARMetrics[]): NEARTrends {
    const txTrend = this.calculateTrend(
      metrics.map(m => m.transactions.count)
    );
    const volumeTrend = this.calculateTrend(
      metrics.map(m => parseFloat(m.transactions.volume))
    );
    const userGrowth = this.calculateGrowth(
      metrics.map(m => m.transactions.uniqueUsers.length)
    );

    return {
      txTrend,
      volumeTrend,
      userGrowth
    };
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    // Simple linear regression
    const n = values.length;
    const x = [...Array(n)].map((_, i) => i);
    const y = values;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, i) => a + (i * y[i]), 0);
    const sumXX = x.reduce((a, i) => a + (i * i), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  private calculateGrowth(values: number[]): number {
    if (values.length < 2) return 0;
    const first = values[0];
    const last = values[values.length - 1];
    return ((last - first) / first) * 100;
  }

  private calculateCorrelation(
    github: GitHubTrends,
    near: NEARTrends
  ): number {
    // Calculate correlation between GitHub activity and NEAR usage
    const githubActivity = github.commitTrend + github.prTrend;
    const nearActivity = near.txTrend + near.volumeTrend;
    
    return Math.min(1, Math.max(-1, 
      (githubActivity * nearActivity) / 
      (Math.abs(githubActivity) * Math.abs(nearActivity) || 1)
    ));
  }

  private makePredictions(metrics: ProcessedMetrics[]): MetricsPredictions {
    // Implement prediction logic (e.g., using simple moving averages)
    return {
      nextDayActivity: this.predictNextDay(metrics),
      weeklyForecast: this.predictWeek(metrics),
      confidence: this.calculateConfidence(metrics)
    };
  }

  private detectAnomalies(metrics: ProcessedMetrics[]): MetricsAnomalies {
    return {
      github: this.detectGitHubAnomalies(metrics),
      near: this.detectNEARAnomalies(metrics),
      severity: this.calculateAnomalySeverity(metrics)
    };
  }
}

interface MetricsTrends {
  github: GitHubTrends;
  near: NEARTrends;
  correlation: number;
}

interface GitHubTrends {
  commitTrend: number;
  prTrend: number;
  authorGrowth: number;
}

interface NEARTrends {
  txTrend: number;
  volumeTrend: number;
  userGrowth: number;
}

interface MetricsPredictions {
  nextDayActivity: number;
  weeklyForecast: number[];
  confidence: number;
}

interface MetricsAnomalies {
  github: Array<{ type: string; severity: number }>;
  near: Array<{ type: string; severity: number }>;
  severity: number;
}
