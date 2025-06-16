import { SDKConfig } from "../types/sdk";
import { ValidationResult, ValidationError } from "../types/validation";
import { ErrorCode } from "../types/errors";

export function validateConfig(config: SDKConfig): ValidationResult {
  const errors: ValidationError[] = [];

  if (!config.githubToken) {
    errors.push({
      code: ErrorCode.INVALID_CONFIG,
      message: "githubToken is required",
    });
  }

  if (!config.githubRepo) {
    errors.push({
      code: ErrorCode.INVALID_CONFIG,
      message: "githubRepo is required",
    });
  }

  if (config.githubRepo && !config.githubRepo.includes("/")) {
    errors.push({
      code: ErrorCode.INVALID_CONFIG,
      message: 'githubRepo must be in format "owner/repo"',
    });
  }

  if (config.storage && config.storage.type === "postgres") {
    const { host, port, database, user, password } = config.storage.config;
    if (!host || !port || !database || !user || !password) {
      errors.push({
        code: ErrorCode.INVALID_CONFIG,
        message: "Invalid postgres configuration",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
    timestamp: Date.now(),
    metadata: {
      source: "github",
      validationType: "data",
    },
  };
}
