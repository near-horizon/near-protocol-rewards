import { JSONValue } from './json';
import { ErrorCode } from './errors';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  timestamp: number;
  metadata: {
    source: 'github' | 'near';
    validationType: 'data' | 'format' | 'consistency';
  };
}

export interface ValidationError {
  code: ErrorCode;
  message: string;
  field?: string;
  value?: JSONValue;
  context?: Record<string, JSONValue>;
}

export interface ValidationWarning {
  code: ErrorCode;
  message: string;
  field?: string;
  value?: JSONValue;
  context?: Record<string, JSONValue>;
}

export interface ValidationThresholds {
  github: {
    minCommits: number;
    minPRs: number;
    minIssues: number;
    minAuthors: number;
  };
  near: {
    minTransactions: number;
    minVolume: string;
    minUniqueUsers: number;
    minContractCalls: number;
  };
}

// Type guard for validation errors
export function isValidationError(obj: unknown): obj is ValidationError {
  return typeof obj === 'object' && obj !== null &&
    'code' in obj && 'message' in obj;
}
