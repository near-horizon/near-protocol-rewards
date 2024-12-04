import { GitHubMetrics } from "../types/metrics";
import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from "../types/validation";
import { ErrorCode } from "../types/errors";

export class Validator {
  validateMetrics(metrics: GitHubMetrics): ValidationResult {
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

    // Validate PR metrics
    if (metrics.pullRequests.merged < 0) {
      errors.push({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Invalid PR count",
      });
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
    const totalActivity =
      metrics.commits.count +
      metrics.pullRequests.merged +
      metrics.reviews.count +
      metrics.issues.closed;

    // No penalty if activity is reasonable
    if (totalActivity <= 100) {
      return 1;
    }

    // Apply penalty for excessive activity
    return Math.max(0.5, 100 / totalActivity);
  }
}
