import { NEARMetrics, ValidationResult, ValidationError, ValidationWarning } from '../types';
import { Logger } from '../utils/logger';

interface NEARValidatorConfig {
  logger: Logger;
  thresholds?: {
    minTransactions?: number;
    maxTransactionsPerDay?: number;
    minUniqueUsers?: number;
    minContractCalls?: number;
    maxVolumePerTx?: string;
  };
}

export class NEARValidator {
  private readonly logger: Logger;
  private readonly thresholds: Required<NEARValidatorConfig['thresholds']>;

  constructor(config: NEARValidatorConfig) {
    this.logger = config.logger;
    // Initialize with default values
    this.thresholds = {
      minTransactions: config.thresholds?.minTransactions ?? 1,
      maxTransactionsPerDay: config.thresholds?.maxTransactionsPerDay ?? 1000,
      minUniqueUsers: config.thresholds?.minUniqueUsers ?? 1,
      minContractCalls: config.thresholds?.minContractCalls ?? 1,
      maxVolumePerTx: config.thresholds?.maxVolumePerTx ?? '10000'
    };
  }

  validate(metrics: NEARMetrics): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate transactions
    this.validateTransactions(metrics, errors, warnings);
    
    // Validate contract calls
    this.validateContractCalls(metrics, errors, warnings);
    
    // Validate timestamps and block height
    this.validateMetadata(metrics, errors);

    const isValid = errors.length === 0;

    if (!isValid) {
      this.logger.warn('NEAR validation failed', { errors });
    }
    if (warnings.length > 0) {
      this.logger.warn('NEAR validation warnings', { warnings });
    }

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

  private validateTransactions(
    metrics: NEARMetrics,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const { transactions } = metrics;

    // Check minimum transactions with null coalescing
    const txCount = transactions?.count ?? 0;
    if (txCount < this.thresholds.minTransactions) {
      warnings.push({
        code: 'LOW_TRANSACTION_COUNT',
        message: `Transaction count (${txCount}) below minimum threshold`,
        context: { threshold: this.thresholds.minTransactions }
      });
    }

    // Check transaction frequency
    const txPerDay = txCount / 30; // Assuming 30-day period
    if (txPerDay > this.thresholds.maxTransactionsPerDay) {
      errors.push({
        code: 'SUSPICIOUS_TRANSACTION_FREQUENCY',
        message: 'Unusually high transaction frequency detected',
        context: { 
          transactionsPerDay: txPerDay,
          threshold: this.thresholds.maxTransactionsPerDay
        }
      });
    }

    // Validate transaction volume
    const volume = transactions?.volume ?? '0';
    const avgVolumePerTx = parseFloat(volume) / Math.max(txCount, 1);
    if (avgVolumePerTx > parseFloat(this.thresholds.maxVolumePerTx)) {
      warnings.push({
        code: 'HIGH_AVERAGE_VOLUME',
        message: 'Unusually high average transaction volume',
        context: { 
          averageVolume: avgVolumePerTx,
          threshold: this.thresholds.maxVolumePerTx
        }
      });
    }

    // Check user diversity
    const uniqueUsers = transactions?.uniqueUsers?.length ?? 0;
    if (uniqueUsers < this.thresholds.minUniqueUsers) {
      warnings.push({
        code: 'LOW_USER_DIVERSITY',
        message: 'Low number of unique users',
        context: { 
          uniqueUsers,
          threshold: this.thresholds.minUniqueUsers
        }
      });
    }
  }

  private validateContractCalls(
    metrics: NEARMetrics,
    _errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const { contract } = metrics;
    const calls = contract?.calls ?? 0;

    // Check minimum contract calls
    if (calls < this.thresholds.minContractCalls) {
      warnings.push({
        code: 'LOW_CONTRACT_USAGE',
        message: 'Low contract usage detected',
        context: { 
          calls,
          threshold: this.thresholds.minContractCalls
        }
      });
    }

    // Check caller diversity
    const uniqueCallers = contract?.uniqueCallers ?? [];
    if (calls > 0 && uniqueCallers.length === 1) {
      warnings.push({
        code: 'SINGLE_CONTRACT_CALLER',
        message: 'All contract calls from single caller',
        context: { 
          totalCalls: calls,
          caller: uniqueCallers[0]
        }
      });
    }
  }

  private validateMetadata(
    metrics: NEARMetrics,
    errors: ValidationError[]
  ): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (now - (metrics.metadata?.collectionTimestamp ?? 0) > maxAge) {
      errors.push({
        code: 'STALE_DATA',
        message: 'Metrics data is too old',
        context: { 
          timestamp: metrics.metadata?.collectionTimestamp,
          maxAge
        }
      });
    }

    if (!metrics.metadata?.blockHeight) {
      errors.push({
        code: 'MISSING_BLOCK_HEIGHT',
        message: 'Block height information is missing'
      });
    }
  }
}
