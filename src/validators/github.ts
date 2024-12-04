import { GitHubMetrics } from "../types/metrics";
import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from "../types/validation";
import { Logger } from "../utils/logger";
import { ErrorCode } from "../types/errors";

export interface GitHubValidatorConfig {
  logger: Logger;
  minCommits?: number;
  maxCommitsPerDay?: number;
  minAuthors?: number;
  maxDailyCommits?: number;
  minReviewPrRatio?: number;
}

export class GitHubValidator {
  constructor(private readonly config: GitHubValidatorConfig) {}

  validate(metrics: GitHubMetrics): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic validation
    if (!metrics) {
      errors.push({
        code: ErrorCode.VALIDATION_ERROR,
        message: "No metrics provided",
      });
      return {
        isValid: false,
        errors,
        warnings,
        timestamp: Date.now(),
        metadata: { source: "github", validationType: "data" },
      };
    }

    // Validate commit metrics
    if (metrics.commits.count < 0) {
      errors.push({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Invalid commit count",
      });
    }

    // Check commit frequency
    const maxDailyCommits = Math.max(...metrics.commits.frequency.daily);
    if (maxDailyCommits > (this.config.maxDailyCommits || 15)) {
      warnings.push({
        code: ErrorCode.HIGH_VELOCITY,
        message: "Suspicious commit activity detected",
        context: { maxDailyCommits },
      });
    }

    // Check author diversity
    if (metrics.commits.authors.length < (this.config.minAuthors || 2)) {
      warnings.push({
        code: ErrorCode.LOW_AUTHOR_DIVERSITY,
        message: "Low author diversity",
        context: { authorCount: metrics.commits.authors.length },
      });
    }

    // Validate PR metrics
    if (metrics.pullRequests.merged < 0) {
      errors.push({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Invalid PR count",
      });
    }

    // Validate review ratio
    if (metrics.pullRequests.merged > 0) {
      const reviewRatio = metrics.reviews.count / metrics.pullRequests.merged;
      if (reviewRatio < (this.config.minReviewPrRatio || 0.5)) {
        warnings.push({
          code: ErrorCode.LOW_REVIEW_ENGAGEMENT,
          message: "Low review engagement detected",
          context: { reviewRatio },
        });
      }
    }

    // Validate review metrics
    if (metrics.reviews.count < 0) {
      errors.push({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Invalid review count",
      });
    }

    // Validate issue metrics
    if (metrics.issues.closed < 0) {
      errors.push({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Invalid issue count",
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      timestamp: Date.now(),
      metadata: {
        source: "github",
        validationType: "data",
      },
    };
  }

  calculateVelocityPenalty(metrics: GitHubMetrics): number {
    const maxDailyCommits = Math.max(...metrics.commits.frequency.daily);
    const maxAllowedDaily = this.config.maxDailyCommits || 15;

    if (maxDailyCommits > maxAllowedDaily) {
      // Apply penalty based on how much the limit was exceeded
      const excessRatio = maxDailyCommits / maxAllowedDaily;
      return Math.max(0.5, 1 / excessRatio); // Minimum 50% penalty
    }

    return 1; // No penalty
  }
}
