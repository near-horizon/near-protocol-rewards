import { Logger } from '../utils/logger';
import { ValidationResult, ValidationError, ValidationThresholds } from '../types';

export abstract class BaseValidator {
  constructor(
    protected readonly logger: Logger,
    protected readonly thresholds: Required<ValidationThresholds>
  ) {}

  protected createValidationResult(
    isValid: boolean,
    errors: ValidationError[],
    warnings: ValidationError[] = []
  ): ValidationResult {
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

  protected createError(
    code: string,
    message: string,
    context: Record<string, unknown>
  ): ValidationError {
    return { code, message, context };
  }
}
