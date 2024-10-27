import { ErrorCode } from '../utils/errors';
import { Logger } from '../utils/logger';
import { JSONValue } from './common';

export type MetricsSource = 'github' | 'near';
export type ValidationType = 'data' | 'security';

export interface ValidationMetadata {
  source: MetricsSource;
  validationType: ValidationType;
}

export interface ValidationContext {
  [key: string]: JSONValue;
}

export interface ValidationError {
  code: string;
  message: string;
  context?: ValidationContext;
}

export interface ValidationWarning extends ValidationError {}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  timestamp: number;
  metadata: {
    source: string;
    validationType: string;
  };
}

export interface ValidationThresholds {
  minCommits: number;
  maxCommitsPerDay: number;
  minAuthors: number;
  // ... other thresholds
}

export interface ValidationConfig {
  thresholds?: Partial<ValidationThresholds>;
  logger?: Logger;
}
