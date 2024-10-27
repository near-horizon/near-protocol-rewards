import { ErrorCode } from '../utils/errors';

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
  maxTimeDrift: number;
  minActivityCorrelation: number;
  maxDataAge: number;
  maxUserDiffRatio: number;
}
