import { Logger } from '../utils/logger';
import { GitHubMetrics, NEARMetrics, ProcessedMetrics } from '../types';
import { BaseError, ErrorCode } from '../types/errors';
import { toErrorContext } from '../utils/format-error';
import { MetricsSource } from '../types/metrics';

export class DataAggregator {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  process(github: GitHubMetrics, near: NEARMetrics): ProcessedMetrics {
    try {
      const timestamp = Date.now();
      
      return {
        timestamp,
        collectionTimestamp: timestamp,
        github,
        near,
        projectId: github.projectId,
        periodStart: timestamp - (24 * 60 * 60 * 1000),
        periodEnd: timestamp,
        score: this.calculateScore(github, near),
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
          timestamp,
          metadata: {
            source: 'github' as MetricsSource,
            validationType: 'data'
          }
        },
        metadata: {
          collectionTimestamp: timestamp,
          source: 'github' as MetricsSource,
          projectId: github.projectId,
          periodStart: timestamp - (24 * 60 * 60 * 1000),
          periodEnd: timestamp
        }
      };
    } catch (error) {
      this.logger.error('Processing failed', toErrorContext(error));
      throw new BaseError(
        'Failed to process metrics',
        ErrorCode.PROCESSING_ERROR
      );
    }
  }

  private calculateScore(github: GitHubMetrics, near: NEARMetrics) {
    const githubScore = this.calculateGitHubScore(github);
    const nearScore = this.calculateNEARScore(near);
    
    return {
      total: Math.round((githubScore + nearScore) / 2),
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

  // ... rest of the implementation
}
