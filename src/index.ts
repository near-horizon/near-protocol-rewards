/**
 * NEAR Protocol Rewards SDK
 * Public exports for SDK integration
 * 
 * Exports:
 * 1. Main SDK class
 * 2. Essential types for configuration and metrics
 * 3. Error handling utilities
 * 
 * Note: Internal components like collectors and validators
 * are not exported as they're managed by the SDK.
 */

// Main SDK class - primary integration point
export { NEARProtocolRewardsSDK } from './sdk';

// Essential types for configuration and responses
export type {
  // Configuration
  SDKConfig,
  
  // Core metrics types
  ProcessedMetrics,
  GitHubMetrics,
  NEARMetrics,
  
  // Validation
  ValidationResult
} from './types';

// Error handling
export { BaseError, ErrorCode } from './utils/errors';

