import { GitHubMetrics, ValidationResult, ValidationError, ValidationWarning } from '../types';
import { Logger } from '../utils/logger';

interface GitHubValidatorConfig {
  logger: Logger;
  thresholds?: {
    minCommits?: number;
    maxCommitsPerDay?: number;
    minAuthors?: number;
    suspiciousAuthorRatio?: number;
  };
}

export class GitHubValidator {
  private readonly logger: Logger;
  private readonly thresholds: Required<GitHubValidatorConfig['thresholds']>;

  constructor(config: GitHubValidatorConfig) {
    this.logger = config.logger;
    this.thresholds = {
      minCommits: config.thresholds?.minCommits || 1,
      maxCommitsPerDay: config.thresholds?.maxCommitsPerDay || 50,
      minAuthors: config.thresholds?.minAuthors || 1,
      suspiciousAuthorRatio: config.thresholds?.suspiciousAuthorRatio || 0.8
    };
  }

  validate(metrics: GitHubMetrics): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate commit data
    this.validateCommits(metrics, errors, warnings);
    
    // Validate PR data
    this.validatePullRequests(metrics, errors, warnings);
    
    // Validate issue data
    this.validateIssues(metrics, errors, warnings);
    
    // Validate timestamps
    this.validateTimestamps(metrics, errors);

    const isValid = errors.length === 0;

    if (!isValid) {
      this.logger.warn('GitHub validation failed', { errors });
    }
    if (warnings.length > 0) {
      this.logger.warn('GitHub validation warnings', { warnings });
    }

    return {
      isValid,
      errors,
      warnings,
      timestamp: Date.now(),
      metadata: {
        source: 'github',
        validationType: 'data'
      }
    };
  }

  private validateCommits(
    metrics: GitHubMetrics,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const { commits } = metrics;

    // Check minimum commits
    if (commits.count < this.thresholds.minCommits) {
      warnings.push({
        code: 'LOW_COMMIT_COUNT',
        message: `Commit count (${commits.count}) below minimum threshold`,
        context: { threshold: this.thresholds.minCommits }
      });
    }

    // Check for suspicious commit frequency
    const commitsPerDay = commits.frequency * 7;
    if (commitsPerDay > this.thresholds.maxCommitsPerDay) {
      errors.push({
        code: 'SUSPICIOUS_COMMIT_FREQUENCY',
        message: 'Unusually high commit frequency detected',
        context: { 
          commitsPerDay,
          threshold: this.thresholds.maxCommitsPerDay
        }
      });
    }

    // Check author diversity
    if (commits.authors.length < this.thresholds.minAuthors) {
      warnings.push({
        code: 'LOW_AUTHOR_DIVERSITY',
        message: 'Low number of unique commit authors',
        context: { 
          authors: commits.authors.length,
          threshold: this.thresholds.minAuthors
        }
      });
    }
  }

  private validatePullRequests(
    metrics: GitHubMetrics,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const { pullRequests } = metrics;

    // Check for suspicious PR patterns
    const totalPRs = pullRequests.open + pullRequests.merged;
    if (totalPRs > 0 && pullRequests.authors.length === 1) {
      warnings.push({
        code: 'SINGLE_PR_AUTHOR',
        message: 'All PRs from single author',
        context: { totalPRs, author: pullRequests.authors[0] }
      });
    }
  }

  private validateIssues(
    metrics: GitHubMetrics,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const { issues } = metrics;

    // Check for healthy issue engagement
    const totalIssues = issues.open + issues.closed;
    if (totalIssues > 0 && issues.participants.length === 1) {
      warnings.push({
        code: 'LOW_ISSUE_ENGAGEMENT',
        message: 'Low community engagement in issues',
        context: { 
          totalIssues,
          participants: issues.participants.length
        }
      });
    }
  }

  private validateTimestamps(
    metrics: GitHubMetrics,
    errors: ValidationError[]
  ): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (now - metrics.metadata.collectionTimestamp > maxAge) {
      errors.push({
        code: 'STALE_DATA',
        message: 'Metrics data is too old',
        context: { 
          timestamp: metrics.metadata.collectionTimestamp,
          maxAge
        }
      });
    }
  }
}
