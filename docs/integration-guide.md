# NEAR Protocol Rewards SDK Integration Guide

This guide outlines the requirements and specifications for the SDK to integrate with the Protocol Rewards Dashboard.

Link to the [dashboard repo](https://github.com/jbarnes850/protocol-rewards-dashboard)

## Core Interfaces

### Metrics Structure

```typescript
interface ProcessedMetrics {
  repositoryId: string;
  timeframe: 'day' | 'week' | 'month';
  contributors: ContributorMetrics[];
  totalContributions: {
    commits: number;
    pullRequests: number;
    issues: number;
    reviews: number;
  };
  validation: {
    isValid: boolean;
    errors: string[];
  };
  timestamp: number;
}

interface ContributorMetrics {
  contributorId: string;
  commits: number;
  additions: number;
  deletions: number;
  pullRequests: {
    opened: number;
    reviewed: number;
    merged: number;
  };
  issues: {
    opened: number;
    closed: number;
    commented: number;
  };
  timestamp: number;
}
```

### Reward Calculation

```typescript
interface RewardCalculation {
  contributorId: string;
  rewardAmount: number;
  metrics: ProcessedMetrics;
  timestamp: number;
}
```

### SDK Configuration

```typescript
interface SDKConfig {
  githubToken: string;
  repoFullName: string;
  timeframe?: 'day' | 'week' | 'month';
  maxRequestsPerSecond?: number;
  logger?: Console;
}
```

## Event System

The SDK must implement these events:

```typescript
interface SDKEvents {
  'metrics:collected': (metrics: ProcessedMetrics) => void;
  'reward:calculated': (reward: RewardCalculation) => void;
  'error': (error: BaseError) => void;
  'tracking:started': () => void;
  'tracking:stopped': () => void;
}
```

### Error Handling

```typescript
const ErrorCode = {
  SDK_ERROR: 'SDK_ERROR',
  API_ERROR: 'API_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  CALCULATION_ERROR: 'CALCULATION_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  INVALID_CONFIG: 'INVALID_CONFIG'
} as const;

class BaseError extends Error {
  constructor(
    public code: ErrorCodeType,
    message: string,
    public details?: string
  ) {
    super(message);
  }
}
```

## Required Methods

The SDK must implement these methods:

```typescript
interface GitHubRewardsSDK {
  // Event handling
  on<K extends keyof SDKEvents>(event: K, listener: SDKEvents[K]): void;
  off<K extends keyof SDKEvents>(event: K, listener: SDKEvents[K]): void;
  
  // Core functionality
  startTracking(): Promise<void>;
  stopTracking(): Promise<void>;
  getMetrics(): Promise<ProcessedMetrics | null>;
  healthCheck(): Promise<boolean>;
}
```

## Integration Requirements

1. **Real-time Updates**
   - Emit `metrics:collected` event when new data is available
   - Update frequency should be configurable (default: 30 seconds)
   - Handle rate limiting gracefully

2. **Data Collection**
   - Track all specified metrics in `ContributorMetrics`
   - Aggregate data for `totalContributions`
   - Validate data before emitting events

3. **Reward Calculation**
   - Calculate rewards based on:
     - Commit activity (weight: 10)
     - PR merges (weight: 20)
     - PR reviews (weight: 15)
   - Emit `reward:calculated` event after processing

4. **Error Handling**
   - Use appropriate error codes
   - Include detailed error messages
   - Handle GitHub API rate limits
   - Implement retry logic

## Usage Example

```typescript
const sdk = new GitHubRewardsSDK({
  githubToken: 'github_token',
  repoFullName: 'org/repo',
  timeframe: 'week',
  maxRequestsPerSecond: 5
});

// Set up event listeners
sdk.on('metrics:collected', (metrics) => {
  console.log('New metrics:', metrics);
});

sdk.on('reward:calculated', (reward) => {
  console.log('Reward calculated:', reward);
});

sdk.on('error', (error) => {
  console.error('Error:', error);
});

// Start tracking
await sdk.startTracking();
```

## Dashboard Integration Points

The SDK integrates with these dashboard components:

1. **NetworkStats**
   - Uses `totalContributions` for network-wide metrics
   - Updates in real-time with new metrics

2. **DeveloperMetrics**
   - Uses individual `ContributorMetrics`
   - Displays historical performance

3. **ActivityFeed**
   - Shows real-time updates from metrics
   - Requires timestamp for each activity

4. **RewardCalculator**
   - Uses `RewardCalculation` events
   - Displays current and historical rewards

## Rate Limiting and Performance

1. **GitHub API Limits**
   - Respect GitHub's rate limits
   - Implement token bucket algorithm
   - Default: 5 requests per second

2. **Data Caching**
   - Cache metrics data locally
   - Update cache on new metrics
   - Clear cache on `stopTracking`

3. **Performance Considerations**
   - Batch API requests when possible
   - Implement pagination for large datasets
   - Use efficient data structures

## Testing Requirements

1. **Unit Tests**
   - Test all public methods
   - Verify event emissions
   - Test error handling

2. **Integration Tests**
   - Test GitHub API integration
   - Verify rate limiting
   - Test data consistency

3. **Performance Tests**
   - Test with large repositories
   - Verify memory usage
   - Check update frequency accuracy

## Security Requirements

1. **Token Handling**
   - Secure GitHub token storage
   - Token validation
   - Token refresh handling

2. **Data Validation**
   - Validate all API responses
   - Sanitize metrics data
   - Verify calculation inputs

## Support

This guide ensures the SDK provides all necessary functionality for the dashboard while maintaining performance, security, and reliability standards.
