/**
 * NEAR Protocol Rewards SDK
 * Public exports for SDK integration
 */

// Main SDK class
export { NEARProtocolRewardsSDK } from './sdk';

// Types
export type {
  GitHubMetrics,
  NEARMetrics,
  ProcessedMetrics,
  StoredMetrics,
  MetricsMetadata,
  MetricsSource
} from './types/metrics';

export type {
  SDKConfig,
  RequiredSDKConfig,
  RewardCalculation
} from './types/sdk';

export type {
  ValidationResult,
  ValidationError,
  ValidationWarning
} from './types/validation';

// Error handling
export { BaseError, ErrorCode } from './utils/errors';

