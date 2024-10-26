import { GitHubMetrics, ValidationResult, ValidationError, ValidationWarning } from '../types';
import { Logger } from '../utils/logger';
import { ErrorCode } from '../utils/errors';

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
      minCommits: config.thresholds?.minCommits ?? 1,
      maxCommitsPerDay: config.thresholds?.maxCommitsPerDay ?? 50,
      minAuthors: config.thresholds?.minAuthors ?? 1,
      suspiciousAuthorRatio: config.thresholds?.suspiciousAuthorRatio ?? 0.8
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
    const commits = metrics.commits;
    const count = commits?.count ?? 0;
    const frequency = commits?.frequency ?? 0;
    const authors = commits?.authors ?? [];

    // Check minimum commits
    if (count < this.thresholds.minCommits) {
      warnings.push({
        code: ErrorCode.LOW_COMMIT_COUNT,
        message: `Commit count (${count}) below minimum threshold`,
        context: { 
          count,
          threshold: this.thresholds.minCommits 
        }
      });
    }

    // Check for suspicious commit frequency
    const commitsPerDay = frequency * 7;
    if (commitsPerDay > this.thresholds.maxCommitsPerDay) {
      errors.push({
        code: ErrorCode.SUSPICIOUS_COMMIT_FREQUENCY,
        message: 'Unusually high commit frequency detected',
        context: { 
          commitsPerDay,
          threshold: this.thresholds.maxCommitsPerDay
        }
      });
    }

    // Check author diversity
    if (authors.length < this.thresholds.minAuthors) {
      warnings.push({
        code: ErrorCode.LOW_AUTHOR_DIVERSITY,
        message: 'Low number of unique commit authors',
        context: { 
          authorCount: authors.length,
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
    const prs = metrics.pullRequests;
    const open = prs?.open ?? 0;
    const merged = prs?.merged ?? 0;
    const authors = prs?.authors ?? [];

    // Check for suspicious PR patterns
    const totalPRs = open + merged;
    if (totalPRs > 0 && authors.length === 1) {
      warnings.push({
        code: ErrorCode.SINGLE_PR_AUTHOR,
        message: 'All PRs from single author',
        context: { 
          totalPRs, 
          author: authors[0],
          threshold: this.thresholds.minAuthors
        }
      });
    }

    // Check PR merge ratio
    if (totalPRs > 10 && (merged / totalPRs) < 0.3) {
      warnings.push({
        code: ErrorCode.LOW_PR_MERGE_RATE,
        message: 'Low PR merge rate detected',
        context: {
          totalPRs,
          mergedPRs: merged,
          mergeRate: merged / totalPRs
        }
      });
    }
  }

  private validateIssues(
    metrics: GitHubMetrics,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const issues = metrics.issues;
    const open = issues?.open ?? 0;
    const closed = issues?.closed ?? 0;
    const participants = issues?.participants ?? [];

    // Check for healthy issue engagement
    const totalIssues = open + closed;
    if (totalIssues > 0 && participants.length === 1) {
      warnings.push({
        code: ErrorCode.LOW_ISSUE_ENGAGEMENT,
        message: 'Low community engagement in issues',
        context: { 
          totalIssues,
          participantCount: participants.length,
          threshold: this.thresholds.minAuthors
        }
      });
    }

    // Check issue resolution rate
    if (totalIssues > 10 && (closed / totalIssues) < 0.5) {
      warnings.push({
        code: ErrorCode.LOW_ISSUE_RESOLUTION_RATE,
        message: 'Low issue resolution rate',
        context: {
          totalIssues,
          closedIssues: closed,
          resolutionRate: closed / totalIssues
        }
      });
    }
  }

  private validateTimestamps(
    metrics: GitHubMetrics,
    errors: ValidationError[]
  ): void {
    const timestamp = metrics.metadata?.collectionTimestamp;
    if (!timestamp) {
      errors.push({
        code: ErrorCode.MISSING_TIMESTAMP,
        message: 'Missing collection timestamp',
        context: { metadata: metrics.metadata }
      });
      return;
    }

    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (now - timestamp > maxAge) {
      errors.push({
        code: ErrorCode.STALE_DATA,
        message: 'Metrics data is too old',
        context: { 
          timestamp,
          maxAge,
          age: now - timestamp
        }
      });
    }
  }
}
