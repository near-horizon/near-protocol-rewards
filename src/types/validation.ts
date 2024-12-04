import { ErrorCode } from "./errors";
import { MetricsSource } from "./metrics";

export interface ValidationMetadata {
  source: MetricsSource;
  validationType: "data" | "security" | "performance";
}

export type ValidationErrorCode =
  | "TIMESTAMP_DRIFT"
  | "STALE_DATA"
  | "USER_COUNT_DISCREPANCY"
  | "LOW_ACTIVITY_CORRELATION"
  | "VALIDATION_ERROR"
  | ErrorCode; // Include base error codes

export interface ValidationError {
  code: ValidationErrorCode;
  message: string;
  context?: Record<string, unknown>;
}

export interface ValidationWarning {
  code: ValidationErrorCode;
  message: string;
  context?: Record<string, unknown>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  timestamp: number;
  metadata: ValidationMetadata;
}

export function isValidationError(obj: unknown): obj is ValidationError {
  return (
    typeof obj === "object" && obj !== null && "code" in obj && "message" in obj
  );
}
