import { GitHubMetrics } from "../types/metrics";
import { ValidationResult, ValidationError } from "../types/validation";
import { ErrorCode } from "../types/errors";
import { Logger } from "../utils/logger";

export interface GitHubValidatorConfig {
  logger?: Logger;
  minCommits?: number;
  maxCommitsPerDay?: number;
  minAuthors?: number;
  minReviewPrRatio?: number;
}

export class GitHubValidator {
  private config: Required<Omit<GitHubValidatorConfig, 'logger'>>;
  private logger?: Logger;

  constructor(config: GitHubValidatorConfig = {}) {
    this.logger = config.logger;
    this.config = {
      minCommits: config.minCommits || 10,
      maxCommitsPerDay: config.maxCommitsPerDay || 15,
      minAuthors: config.minAuthors || 1,
      minReviewPrRatio: config.minReviewPrRatio || 0.5,
    };
  }

  validate(metrics: GitHubMetrics): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Single author validation
    if (metrics.commits.authors.length === 1) {
      warnings.push({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Single-author repository detected. Consider seeking contributors for project sustainability.",
      });

      // Enhanced validation for single-author repos
      if (metrics.commits.count > this.config.maxCommitsPerDay * 5) {
        errors.push({
          code: ErrorCode.VALIDATION_ERROR,
          message: "Excessive commits for single-author repository",
        });
      }

      if (!metrics.pullRequests.merged && metrics.commits.count > 50) {
        warnings.push({
          code: ErrorCode.VALIDATION_ERROR,
          message: "Consider using pull requests for better change management",
        });
      }
    }

    // Validate commit frequency
    const maxDailyCommits = metrics.commits.frequency.daily.reduce(
      (max, count) => Math.max(max, count),
      0
    );

    if (maxDailyCommits > this.config.maxCommitsPerDay) {
      errors.push({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Daily commit limit exceeded",
        context: {
          maxAllowed: this.config.maxCommitsPerDay,
          found: maxDailyCommits,
        },
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
}
