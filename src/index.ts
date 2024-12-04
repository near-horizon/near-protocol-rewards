/**
 * NEAR Protocol Rewards SDK
 *
 * Track and reward developer contributions through GitHub metrics
 */

export { GitHubRewardsSDK } from "./sdk";
export { GitHubCollector } from "./collectors/github";
export { ConsoleLogger } from "./utils/logger";
export { RateLimiter } from "./utils/rate-limiter";

// Types
export {
  SDKConfig,
  RequiredSDKConfig,
  RewardCalculation,
  StorageConfig,
} from "./types/sdk";

export { GitHubMetrics, ProcessedMetrics, Score } from "./types/metrics";

export {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationMetadata,
} from "./types/validation";

export { BaseError, ErrorCode, ErrorDetail } from "./types/errors";
