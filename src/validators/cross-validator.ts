import { GitHubMetrics, NEARMetrics, ValidationResult } from '../types';
import { Logger } from '../utils/logger';
import { ValidationError, ErrorCode } from '../utils/errors';

interface CrossValidatorConfig {
  logger: Logger;
  thresholds?: {
    maxTimeDrift?: number; // Maximum allowed time difference between metrics
    minActivityCorrelation?: number; // Minimum correlation between GitHub and NEAR activity
  };
}

export class CrossValidator {
  private readonly logger: Logger;
  private readonly thresholds: Required<CrossValidatorConfig['thresholds']>;

  constructor(config: CrossValidatorConfig) {
    this.logger = config.logger;
    this.thresholds = {
      maxTimeDrift: config.thresholds?.maxTimeDrift ?? 3600000, // 1 hour default
      minActivityCorrelation: config.thresholds?.minActivityCorrelation ?? 0.3
    };
  }

  validate(github: GitHubMetrics, near: NEARMetrics): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    this.validateTimestamps(github, near, errors);
    this.validateActivityCorrelation(github, near, warnings);

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      timestamp: Date.now(),
      metadata: {
        source: 'github', // Using github as default source
        validationType: 'data'  // Using data as default type
      }
    };
  }

  private validateTimestamps(
    github: GitHubMetrics,
    near: NEARMetrics,
    errors: ValidationError[]
  ): void {
    const githubTimestamp = github.metadata?.collectionTimestamp ?? 0;
    const nearTimestamp = near.metadata?.collectionTimestamp ?? 0;
    const timeDiff = Math.abs(githubTimestamp - nearTimestamp);

    if (timeDiff > (this.thresholds?.maxTimeDrift ?? 3600000)) {
      errors.push({
        code: ErrorCode.TIMESTAMP_DRIFT,
        message: 'Significant time drift between GitHub and NEAR metrics',
        context: {
          githubTimestamp,
          nearTimestamp,
          drift: timeDiff,
          threshold: this.thresholds.maxTimeDrift
        }
      });
    }
  }

  private validateActivityCorrelation(
    github: GitHubMetrics,
    near: NEARMetrics,
    warnings: ValidationError[]
  ): void {
    const correlation = this.calculateActivityCorrelation(github, near);

    if (correlation < (this.thresholds?.minActivityCorrelation ?? 0.3)) {
      warnings.push({
        code: ErrorCode.LOW_ACTIVITY_CORRELATION,
        message: 'Low correlation between GitHub and NEAR activity',
        context: {
          correlation,
          threshold: this.thresholds.minActivityCorrelation,
          githubActivity: {
            commits: github.commits.count,
            prs: github.pullRequests.merged,
            issues: github.issues.closed
          },
          nearActivity: {
            transactions: near.transactions.count,
            contractCalls: near.contract.calls
          }
        }
      });
    }
  }

  private calculateActivityCorrelation(
    github: GitHubMetrics,
    near: NEARMetrics
  ): number {
    const githubActivity = (
      (github.commits?.count ?? 0) +
      (github.pullRequests?.merged ?? 0) +
      (github.issues?.closed ?? 0)
    ) / 3;

    const nearActivity = (
      (near.transactions?.count ?? 0) +
      (near.contract?.calls ?? 0)
    ) / 2;

    const maxActivity = Math.max(githubActivity, nearActivity);
    if (maxActivity === 0) return 1;

    return Math.min(githubActivity, nearActivity) / maxActivity;
  }
}
