# NEAR Protocol Rewards SDK API Reference

## Installation

```bash
npm install near-protocol-rewards
```

or

```bash
yarn add near-protocol-rewards
```

## Basic Usage

### Initialization
```typescript
const sdk = new NEARProtocolRewardsSDK({
  projectId: string;
  nearAccount: string;
  githubRepo: string;
  githubToken: string;
  options?: SDKOptions;
});
```

### Core Methods

#### Start Tracking
```typescript
await sdk.startTracking();
```

#### Stop Tracking
```typescript
await sdk.stopTracking();
```

#### Get Metrics
```typescript
const metrics = await sdk.getMetrics();
```

#### Cleanup
```typescript
await sdk.cleanup();
```

## Event Handling

```typescript
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
```

## Configuration

### SDK Options
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
    };
    near?: {
      minTransactions?: number;
      maxTransactionsPerDay?: number;
      minUniqueUsers?: number;
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
```

## Types

### Metrics Types

```typescript
interface GitHubMetrics {
  commits: {
    count: number;
    frequency: number;
    authors: string[];
  };
  pullRequests: {
    open: number;
    merged: number;
    authors: string[];
  };
  issues: {
    open: number;
    closed: number;
    participants: string[];
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
  };
  contract: {
    calls: number;
    uniqueCallers: string[];
  };
  metadata: {
    collectionTimestamp: number;
    blockHeight: number;
  };
}
```

### Validation Types

```typescript
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
```

## Error Handling

```typescript
// Example error handling
try {
  await sdk.startTracking();
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation errors
    console.error('Validation failed:', error.message);
  } else if (error instanceof APIError) {
    // Handle API errors
    console.error('API error:', error.statusCode, error.message);
  } else {
    // Handle other errors
    console.error('Unknown error:', error);
  }
}
```

## Best Practices

1. **Always cleanup resources**
```typescript
// Ensure cleanup when done
try {
  await sdk.startTracking();
  // ... your code ...
} finally {
  await sdk.cleanup();
}
```

2. **Enable caching for better performance**
```typescript
const sdk = new NEARProtocolRewardsSDK({
  // ... config
  options: {
    cache: {
      enabled: true,
      ttl: 5 * 60 * 1000 // 5 minutes
    }
  }
});
```

## Support

- Documentation: [docs.near.org](https://docs.near.org)
- Discord: [NEAR Discord](https://near.chat)
- GitHub Issues: [Create an issue](https://github.com/near/protocol-rewards/issues)
