import { Logger } from '../utils/logger';
import { ValidationResult, ValidationError } from '../types/validation';
import { ErrorCode } from '../types/errors';

export abstract class BaseValidator {
  constructor(protected readonly logger: Logger) {}

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
    code: ErrorCode,
    message: string,
    context: Record<string, unknown>
  ): ValidationError {
    return { code, message, context };
  }
}
