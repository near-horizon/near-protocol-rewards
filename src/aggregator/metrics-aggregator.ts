import { GitHubMetrics, NEARMetrics } from '../types/metrics';
import { Logger } from '../utils/logger';

interface Score {
  total: number;
  breakdown: {
    github: number;
    near: number;
  };
}

export class MetricsAggregator {
  constructor(private readonly logger: Logger) {}

  aggregate(github: GitHubMetrics, near: NEARMetrics): Score {
    const githubScore = this.calculateGitHubScore(github);
    const nearScore = this.calculateNEARScore(near);
    
    const total = Math.round((githubScore + nearScore) / 2);

    return {
      total,
      breakdown: {
        github: githubScore,
        near: nearScore
      }
    };
  }

  private calculateGitHubScore(metrics: GitHubMetrics): number {
    const scores = {
      commits: this.normalizeScore(metrics.commits.count, 0, 100) * 0.3,
      prs: this.normalizeScore(metrics.pullRequests.merged, 0, 50) * 0.3,
      contributors: this.normalizeScore(metrics.commits.authors.length, 0, 10) * 0.2,
      issues: this.normalizeScore(metrics.issues.closed, 0, 20) * 0.2
    };

    return Math.round(
      scores.commits + scores.prs + scores.contributors + scores.issues
    );
  }

  private calculateNEARScore(metrics: NEARMetrics): number {
    const scores = {
      transactions: this.normalizeScore(metrics.transactions.count, 0, 1000) * 0.4,
      users: this.normalizeScore(metrics.transactions.uniqueUsers.length, 0, 100) * 0.3,
      contractCalls: this.normalizeScore(metrics.contract.calls, 0, 500) * 0.3
    };

    return Math.round(
      scores.transactions + scores.users + scores.contractCalls
    );
  }

  private normalizeScore(value: number, min: number, max: number): number {
    return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  }
}
