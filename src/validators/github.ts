import { GitHubMetrics, ValidationResult, ValidationError, ValidationWarning, ValidationContext } from '../types';
import { Logger } from '../utils/logger';
import { ErrorCode } from '../types/errors';
import { JSONValue } from '../types/json';
import { toJSONErrorContext, toErrorContext } from '../utils/format-error';

interface GitHubValidatorThresholds {
  minCommits: number;
  maxCommitsPerDay: number;
  minAuthors: number;
  suspiciousAuthorRatio: number;
}

interface GitHubValidatorConfig {
  logger: Logger;
  thresholds?: Partial<GitHubValidatorThresholds>;
}

export class GitHubValidator {
  private readonly logger: Logger;
  private readonly thresholds: GitHubValidatorThresholds;

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

    try {
      this.validateCommits(metrics, errors, warnings);
      this.validatePullRequests(metrics, errors, warnings);
      this.validateIssues(metrics, errors, warnings);
      this.validateTimestamps(metrics, errors);

      const isValid = errors.length === 0;

      if (!isValid) {
        this.logger.warn('GitHub validation failed', { 
          validation: {
            errors: errors.map(e => ({
              code: e.code,
              message: e.message,
              context: e.context || {}
            }))
          }
        });
      }
      
      if (warnings.length > 0) {
        this.logger.warn('GitHub validation warnings', { 
          validation: {
            warnings: warnings.map(w => ({
              code: w.code,
              message: w.message,
              context: w.context || {}
            }))
          }
        });
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
    } catch (error) {
      this.logger.error('Validation failed unexpectedly', toErrorContext(error));
      throw error;
    }
  }

  private validateCommits(
    metrics: GitHubMetrics,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const { minCommits, maxCommitsPerDay, minAuthors } = this.thresholds;
    const commits = metrics.commits;
    const count = commits?.count ?? 0;
    const frequency = commits?.frequency ?? 0;
    const authors = commits?.authors ?? [];

    if (count < minCommits) {
      warnings.push({
        code: ErrorCode.LOW_COMMIT_COUNT,
        message: `Commit count (${count}) below minimum threshold`,
        context: { count, threshold: minCommits }
      });
    }

    // Check for suspicious commit frequency
    const commitsPerDay = frequency * 7;
    if (commitsPerDay > maxCommitsPerDay) {
      errors.push({
        code: ErrorCode.SUSPICIOUS_COMMIT_FREQUENCY,
        message: 'Unusually high commit frequency detected',
        context: { 
          commitsPerDay,
          threshold: maxCommitsPerDay
        }
      });
    }

    // Check author diversity
    if (authors.length < minAuthors) {
      warnings.push({
        code: ErrorCode.LOW_AUTHOR_DIVERSITY,
        message: 'Low number of unique commit authors',
        context: { 
          authorCount: authors.length,
          threshold: minAuthors
        }
      });
    }
  }

  private validatePullRequests(
    metrics: GitHubMetrics,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const { minAuthors } = this.thresholds;
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
          threshold: minAuthors
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
    const { minAuthors } = this.thresholds;
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
          threshold: minAuthors
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
