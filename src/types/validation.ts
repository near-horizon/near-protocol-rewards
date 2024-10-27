import { ErrorCode } from '../utils/errors';
import { Logger } from '../utils/logger';

export type MetricsSource = 'github' | 'near';
export type ValidationType = 'data' | 'security';

export interface ValidationMetadata {
  source: MetricsSource;
  validationType: ValidationType;
}

export interface ValidationError {
  code: ErrorCode;
  message: string;
  context: Record<string, unknown>;
}

export interface ValidationWarning extends ValidationError {}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  timestamp: number;
  metadata: ValidationMetadata;
}

export interface ValidationThresholds {
  timeDriftThreshold: number;    // milliseconds
  staleDataThreshold: number;    // milliseconds
  minCorrelation: number;        // 0-1
}

export interface ValidationConfig {
  thresholds?: Partial<ValidationThresholds>;
  logger?: Logger;
}
