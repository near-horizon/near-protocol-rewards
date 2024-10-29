import { NEARMetrics } from '../types/metrics';
import { ValidationResult, ValidationError, ValidationWarning } from '../types/validation';
import { Logger } from '../utils/logger';
import { ErrorCode } from '../types/errors';

export interface NEARValidatorConfig {
  thresholds: {
    minTransactions: number;
    maxTransactionsPerDay: number;
    minUniqueUsers: number;
    minContractCalls: number;
    maxVolumePerTx: string;
  };
  logger: Logger;
}

export class NEARValidator {
  private readonly thresholds: Required<NEARValidatorConfig['thresholds']>;
  private readonly logger: Logger;

  constructor(config: NEARValidatorConfig) {
    this.thresholds = {
      minTransactions: config.thresholds.minTransactions || 1,
      maxTransactionsPerDay: config.thresholds.maxTransactionsPerDay || 1000,
      minUniqueUsers: config.thresholds.minUniqueUsers || 1,
      minContractCalls: config.thresholds.minContractCalls || 1,
      maxVolumePerTx: config.thresholds.maxVolumePerTx || '1000000000000000000000000'
    };
    this.logger = config.logger;
  }

  validate(metrics: NEARMetrics): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate transaction count
    if (metrics.transactions.count < this.thresholds.minTransactions) {
      errors.push({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Transaction count below minimum threshold',
        context: { 
          actual: metrics.transactions.count,
          threshold: this.thresholds.minTransactions
        }
      });
    }

    // Validate unique users
    if (metrics.transactions.uniqueUsers.length < this.thresholds.minUniqueUsers) {
      errors.push({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Unique users below minimum threshold',
        context: {
          actual: metrics.transactions.uniqueUsers.length,
          threshold: this.thresholds.minUniqueUsers
        }
      });
    }

    // Validate contract calls
    if (metrics.contract.calls < this.thresholds.minContractCalls) {
      warnings.push({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Contract calls below minimum threshold',
        context: {
          actual: metrics.contract.calls,
          threshold: this.thresholds.minContractCalls
        }
      });
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      timestamp: Date.now(),
      metadata: {
        source: 'near',
        validationType: 'data'
      }
    };
  }
}
