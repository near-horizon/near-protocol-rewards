import { GitHubValidator } from './github';
import { NEARValidator } from './near';
import { CrossValidator } from './cross-validator';
import { Logger } from '../utils/logger';
import { GitHubMetrics, NEARMetrics, ValidationResult, ProcessedMetrics } from '../types';
import { BaseError, ErrorCode } from '../utils/errors';

interface ValidationManagerConfig {
  logger: Logger;
  thresholds?: {
    github?: {
      minCommits?: number;
      maxCommitsPerDay?: number;
      minAuthors?: number;
      suspiciousAuthorRatio?: number;
    };
    near?: {
      minTransactions?: number;
      maxTransactionsPerDay?: number;
      minUniqueUsers?: number;
      minContractCalls?: number;
    };
    cross?: {
      maxTimeDrift?: number;
      minActivityCorrelation?: number;
    };
  };
}

export class ValidationManager {
  private readonly logger: Logger;
  private readonly githubValidator: GitHubValidator;
  private readonly nearValidator: NEARValidator;
  private readonly crossValidator: CrossValidator;

  constructor(config: ValidationManagerConfig) {
    this.logger = config.logger;
    
    this.githubValidator = new GitHubValidator({
      logger: this.logger,
      thresholds: config.thresholds?.github
    });

    this.nearValidator = new NEARValidator({
      logger: this.logger,
      thresholds: config.thresholds?.near
    });

    this.crossValidator = new CrossValidator({
      logger: this.logger,
      thresholds: config.thresholds?.cross
    });
  }

  async validateMetrics(metrics: ProcessedMetrics): Promise<ValidationResult> {
    try {
      // Run individual validations
      const githubResults = await this.githubValidator.validate(metrics.github);
      const nearResults = await this.nearValidator.validate(metrics.near);
      const crossResults = await this.crossValidator.validate(
        metrics.github,
        metrics.near
      );

      // Combine validation results
      const combinedResults: ValidationResult = {
        isValid: githubResults.isValid && nearResults.isValid && crossResults.isValid,
        errors: [
          ...githubResults.errors,
          ...nearResults.errors,
          ...crossResults.errors
        ],
        warnings: [
          ...githubResults.warnings,
          ...nearResults.warnings,
          ...crossResults.warnings
        ],
        timestamp: Date.now(),
        metadata: {
          source: 'github', // Default to github as primary source
          validationType: 'data'
        }
      };

      // Log validation results
      if (!combinedResults.isValid) {
        this.logger.warn('Validation failed', {
          errors: combinedResults.errors,
          warnings: combinedResults.warnings
        });
      }

      return combinedResults;
    } catch (error) {
      this.logger.error('Validation error', { error });
      throw new BaseError(
        'Validation failed',
        ErrorCode.VALIDATION_ERROR,
        { error }
      );
    }
  }

  async validateGitHubMetrics(metrics: GitHubMetrics): Promise<ValidationResult> {
    return this.githubValidator.validate(metrics);
  }

  async validateNEARMetrics(metrics: NEARMetrics): Promise<ValidationResult> {
    return this.nearValidator.validate(metrics);
  }

  async validateCrossMetrics(
    github: GitHubMetrics,
    near: NEARMetrics
  ): Promise<ValidationResult> {
    return this.crossValidator.validate(github, near);
  }

  getValidationSummary(results: ValidationResult): {
    status: 'valid' | 'warning' | 'error';
    summary: string;
  } {
    if (!results.isValid) {
      return {
        status: 'error',
        summary: `Validation failed with ${results.errors.length} errors and ${results.warnings.length} warnings`
      };
    }

    if (results.warnings.length > 0) {
      return {
        status: 'warning',
        summary: `Validation passed with ${results.warnings.length} warnings`
      };
    }

    return {
      status: 'valid',
      summary: 'All validations passed successfully'
    };
  }
}
