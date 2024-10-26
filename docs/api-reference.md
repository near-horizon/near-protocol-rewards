# NEAR Protocol Rewards SDK API Reference

## Installation

```bash
npm install near-protocol-rewards
```

or

```bash
yarn add near-protocol-rewards
```

## Initialization

```typescript
const sdk = new NEARProtocolRewardsSDK({
projectId: string;
nearAccount: string;
githubRepo: string;
githubToken: string;
options?: SDKOptions;
});
```

## Start automatic tracking

```typescript
await sdk.startTracking();
    ```

## Manual tracking

```typescript
await sdk.trackActivity();
```

## Stop tracking

```typescript
await sdk.stopTracking();
```

## Get current tracking status

```typescript
const status = await sdk.getTrackingStatus();
```

## Get current metrics

```typescript
const metrics = await sdk.getMetrics();
```

## Get historical metrics

```typescript
const history = await sdk.getMetricsHistory({
startTime: number; // Unix timestamp
endTime: number; // Unix timestamp
});
```

## Get project status

```typescript
const status = await sdk.getProjectStatus();
    ```

## Get validation status

```typescript
const validation = await sdk.getValidationStatus();
```

## Cleanup resources

```typescript
await sdk.cleanup();
```

## Options

```typescript
interface SDKOptions {
// Monitoring configuration
monitoring?: {
enabled: boolean;
sampleRate?: number; // 0-1, default: 1
};
// Caching configuration
cache?: {
enabled: boolean;
ttl?: number; // milliseconds
};
// Retry configuration
retry?: {
maxAttempts: number;
baseDelay: number;
maxDelay: number;
};
// Storage configuration
storage?: {
type: 'postgres';
config: {
host: string;
port: number;
database: string;
user: string;
password: string;
};
};
// Validation thresholds
validation?: {
github?: {
minCommits?: number;
maxCommitsPerDay?: number;
minAuthors?: number;
suspiciousAuthorRatio?: number;
};
near?: {
minTransactions?: number;
maxTransactionsPerDay?: number;
minUniqueUsers?: number;
minContractCalls?: number;
};
};
// Custom weights for scoring
weights?: {
github?: {
commits?: number;
pullRequests?: number;
issues?: number;
};
near?: {
transactions?: number;
contractCalls?: number;
uniqueUsers?: number;
};
};
}
System
typescript
// Error events
sdk.on('error', (error: SDKError) => {
console.error('SDK error:', error.message);
});
// Metrics collection events
sdk.on('metrics:collected', (metrics: ProcessedMetrics) => {
console.log('New metrics:', metrics);
});
// Validation events
sdk.on('validation:failed', (errors: ValidationError[]) => {
console.warn('Validation failed:', errors);
});
// Tracking status events
sdk.on('tracking:started', () => {
console.log('Tracking started');
});
sdk.on('tracking:stopped', () => {
console.log('Tracking stopped');
});
// Collection events
sdk.on('collection:failed', (error: CollectionError) => {
console.error('Collection failed:', error);
});
Types
typescript
interface GitHubMetrics {
commits: {
count: number;
frequency: number;
authors: string[];
timestamp: number;
};
pullRequests: {
open: number;
merged: number;
authors: string[];
timestamp: number;
};
issues: {
open: number;
closed: number;
participants: string[];
timestamp: number;
};
metadata: {
collectionTimestamp: number;
repoDetails: {
stars: number;
forks: number;
};
};
}
interface NEARMetrics {
transactions: {
count: number;
volume: string;
uniqueUsers: string[];
timestamp: number;
};
contract: {
calls: number;
uniqueCallers: string[];
timestamp: number;
};
metadata: {
collectionTimestamp: number;
blockHeight: number;
};
}
interface ValidationResult {
isValid: boolean;
errors: ValidationError[];
warnings: ValidationWarning[];
timestamp: number;
metadata: {
source: 'github' | 'near';
validationType: 'data' | 'format' | 'consistency';
};
}
Hooks
typescript
// useNEARProtocolRewards hook
const {
metrics, // Current metrics
history, // Historical metrics
status, // Project status
validation, // Validation status
isLoading, // Loading state
error, // Error state
refresh // Manual refresh function
} = useNEARProtocolRewards({
projectId: string;
refreshInterval?: number;
});
// useMetricsHistory hook
const {
data,
isLoading,
error
} = useMetricsHistory({
projectId: string;
startTime: number;
endTime: number;
});
Components
typescript
// MetricsCard component
<MetricsCard
title: string;
value: number | string;
change?: number;
data?: TimeseriesData;
loading?: boolean;
/>
// ActivityFeed component
<ActivityFeed
activities: Activity[];
loading?: boolean;
maxItems?: number;
/>
// ValidationStatus component
<ValidationStatus
github: ValidationResult;
near: ValidationResult;
onRetry?: () => void;
/>
// DashboardLayout component
<DashboardLayout>
<MetricsCard />
<ActivityFeed />
<ValidationStatus />
</DashboardLayout>
Types
typescript
// Base SDK Error
class SDKError extends Error {
code: string;
context?: Record<string, any>;
}
// Validation Errors
class ValidationError extends SDKError {
code: 'VALIDATION_ERROR';
}
// Collection Errors
class CollectionError extends SDKError {
code: 'COLLECTION_ERROR';
}
// API Errors
class APIError extends SDKError {
code: 'API_ERROR';
statusCode: number;
}
*
typescript
try {
await sdk.startTracking();
} catch (error) {
if (error instanceof ValidationError) {
// Handle validation errors
} else if (error instanceof APIError) {
// Handle API errors
} else {
// Handle other errors
}
}
*
typescript
// Always cleanup when done
await sdk.cleanup();
*
typescript
// Enable caching
const sdk = new NEARProtocolRewardsSDK({
// ... config
options: {
cache: {
enabled: true,
ttl: 5 60 1000 // 5 minutes
}
}
});


## Support

- Documentation: [docs.near.org](https://docs.near.org)
- Discord: [NEAR Discord](https://near.chat)
- GitHub Issues: [Create an issue](https://github.com/near/protocol-rewards/issues)
