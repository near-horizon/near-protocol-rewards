# NEAR Protocol Rewards SDK Implementation Plan

## Overview

Technical implementation plan for NEAR Protocol Rewards SDK beta version. This SDK tracks GitHub and NEAR chain activity, validates data, and calculates rewards for participating projects.

## Core Components

### 1. SDK Configuration & Initialization

```typescript
interface SDKConfig {
  projectId: string;           // Unique identifier for the project
  nearAccount: string;         // NEAR account (e.g., example.near)
  githubRepo: string;          // GitHub repository (format: owner/repo)
  githubToken: string;         // GitHub Personal Access Token
  nearApiEndpoint: string;     // NearBlocks API endpoint
}

class NEARProtocolRewardsSDK {
  private config: SDKConfig;
  private githubCollector: GitHubCollector;
  private nearCollector: NEARCollector;
  private validator: DataValidator;
  private storage: DataStorage;

  constructor(config: SDKConfig) {
    this.validateConfig(config);
    this.initializeCollectors();
    this.setupErrorHandling();
  }
}
```

### 2. Data Collection Layer

#### GitHub Metrics Collection

```typescript
interface GitHubMetrics {
  commits: {
    count: number;
    frequency: number;         // commits per week
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

class GitHubCollector {
  private readonly baseUrl = 'https://api.github.com';
  private readonly headers: Record<string, string>;

  async collectMetrics(): Promise<GitHubMetrics> {
    const [commits, prs, issues] = await Promise.all([
      this.fetchCommits(),
      this.fetchPullRequests(),
      this.fetchIssues()
    ]);
    
    return this.aggregateMetrics(commits, prs, issues);
  }

  private async fetchCommits(): Promise<any> {
    // Implement pagination and rate limiting
    // Handle timeouts and retries
  }
}
```

#### NEAR Chain Metrics Collection

```typescript
interface NEARMetrics {
  transactions: {
    count: number;
    volume: string;           // in NEAR
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

class NEARCollector {
  // Using NearBlocks API: https://api.nearblocks.io/api-docs/
  private readonly endpoints = {
    txns: '/v1/account/${accountId}/txns',
    contract: '/v1/contract/${accountId}/txns'
  };

  async collectMetrics(): Promise<NEARMetrics> {
    const [txns, contractCalls] = await Promise.all([
      this.fetchTransactions(),
      this.fetchContractCalls()
    ]);
    
    return this.aggregateMetrics(txns, contractCalls);
  }
}
```

### 3. Data Validation Layer

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

class DataValidator {
  validateGitHubData(data: GitHubMetrics): ValidationResult {
    const validations = [
      this.validateCommitFrequency(data.commits),
      this.validateAuthorDiversity(data.commits.authors),
      this.validateTimestamps(data)
    ];
    
    return this.aggregateValidations(validations);
  }

  validateNEARData(data: NEARMetrics): ValidationResult {
    const validations = [
      this.validateTransactionCounts(data.transactions),
      this.validateUserAddresses(data.transactions.uniqueUsers),
      this.validateContractCalls(data.contract)
    ];
    
    return this.aggregateValidations(validations);
  }
}
```

### 4. Data Storage Layer

```typescript
interface StorageSchema {
  metrics: {
    id: string;
    projectId: string;
    githubMetrics: GitHubMetrics;
    nearMetrics: NEARMetrics;
    validationResults: ValidationResult[];
    timestamp: number;
  };
  
  validationLogs: {
    id: string;
    projectId: string;
    level: 'error' | 'warning' | 'info';
    message: string;
    timestamp: number;
  };
}

class DataStorage {
  private readonly pool: Pool;  // PostgreSQL pool

  async storeMetrics(data: StorageSchema['metrics']): Promise<void> {
    // Implement database operations with proper error handling
  }

  async queryMetrics(
    projectId: string,
    timeframe: { start: number; end: number }
  ): Promise<StorageSchema['metrics'][]> {
    // Implement efficient querying with indexes
  }
}
```

### 5. Metrics Processing

```typescript
interface ProcessedMetrics {
  score: number;              // 0-100
  breakdown: {
    githubActivity: number;   // 30%
    nearActivity: number;     // 40%
    userGrowth: number;       // 30%
  };
  metadata: {
    calculationTimestamp: number;
    periodStart: number;
    periodEnd: number;
  };
}

class MetricsProcessor {
  private readonly weights = {
    github: {
      commits: 0.4,
      pullRequests: 0.4,
      issues: 0.2
    },
    near: {
      transactions: 0.6,
      contractCalls: 0.4
    }
  };

  calculateScore(
    githubMetrics: GitHubMetrics,
    nearMetrics: NEARMetrics
  ): ProcessedMetrics {
    // Implement scoring logic
    // Consider relative growth and absolute values
  }
}
```

### 6. API Layer

```typescript
interface APIEndpoints {
  // Developer endpoints
  'GET /metrics/:projectId': {
    response: ProcessedMetrics;
  };
  'GET /validation/:projectId': {
    response: ValidationResult[];
  };
  
  // Admin endpoints
  'GET /admin/export': {
    response: {
      projects: Array<{
        projectId: string;
        metrics: ProcessedMetrics;
        validations: ValidationResult[];
      }>;
    };
  };
}
```

## Implementation Schedule

1. Core SDK + GitHub Collection
   - Set up project structure
   - Implement GitHub data collection
   - Basic error handling

2. NEAR Collection + Basic Validation
   - Implement NEAR data collection
   - Set up data validation
   - Add logging system

3. Data Storage Layer
   - Set up PostgreSQL
   - Implement data models
   - Add data persistence

4. Metrics Processing
   - Implement scoring algorithm
   - Add data aggregation
   - Create export functionality

5. API Layer + Testing
   - Build REST API
   - Add authentication
   - Implement testing suite

## Error Handling Strategy

```typescript
class SDKError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: any
  ) {
    super(message);
  }
}

// Implement specific error types
class ValidationError extends SDKError {}
class CollectionError extends SDKError {}
class StorageError extends SDKError {}
```

## Monitoring and Logging

```typescript
interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  component: string;
  message: string;
  metadata?: any;
}

class Logger {
  log(entry: LogEntry): void {
    // Implement logging logic
  }
}
```

## Rate Limiting and Caching

```typescript
interface RateLimiter {
  checkLimit(key: string): boolean;
  updateCount(key: string): void;
  resetCount(key: string): void;
}

interface Cache {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl: number): Promise<void>;
  invalidate(key: string): Promise<void>;
}
```

---

Notes for Implementation:

1. Use TypeScript for all components
2. Implement comprehensive error handling
3. Add logging at key points
4. Include retry logic for API calls
5. Implement proper rate limiting
6. Add data validation at each step
7. Consider adding caching where appropriate
8. Follow NEAR and GitHub API best practices

Yes, exactly! Let me add context about the developer experience and integration process to make it clear for Claude how simple it should be for developers to implement.

```markdown
# NEAR Protocol Rewards SDK - Developer Integration Guide

## Quick Start
Developers should be able to integrate the SDK with just a few lines of code:

```typescript
// Initialize SDK
const rewards = new NEARProtocolRewardsSDK({
  projectId: 'my-project',
  nearAccount: 'myproject.near',
  githubRepo: 'myorg/myproject',
  githubToken: process.env.GITHUB_TOKEN
});

// Auto-track all activity
await rewards.startTracking();
```

## Integration Examples

### Next.js Project

```typescript
// pages/api/track-activity.ts
import { NEARProtocolRewardsSDK } from 'near-protocol-rewards';

export default async function handler(req, res) {
  const rewards = new NEARProtocolRewardsSDK({
    // config
  });

  // Automatically tracks GitHub and NEAR activity
  await rewards.startTracking();
  
  // Optional: Get current metrics
  const metrics = await rewards.getMetrics();
  
  res.status(200).json({ status: 'tracking' });
}
```

### React Component for Viewing Rewards

```typescript
import { useNEARProtocolRewards } from 'near-protocol-rewards/react';

export function RewardsDisplay() {
  const { metrics, isLoading } = useNEARProtocolRewards();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <h2>Your Project Metrics</h2>
      <p>GitHub Score: {metrics.breakdown.githubActivity}</p>
      <p>NEAR Activity: {metrics.breakdown.nearActivity}</p>
      <p>Total Score: {metrics.score}</p>
    </div>
  );
}
```

## Key Developer Experience Points

1. Zero Configuration Tracking
   - SDK should automatically detect and track relevant metrics
   - No manual reporting required from developers

2. Transparent Monitoring
   - Developers can view their metrics in real-time
   - Clear feedback on what's being tracked

3. Simple Integration
   - NPM package: `npm install near-protocol-rewards`
   - Single initialization call
   - Automatic background tracking

4. Developer Dashboard
   - Access to metrics dashboard
   - Real-time status of tracking
   - Reward calculations and history

## Common Integration Patterns

1. Backend Service

```typescript
// Simple background service integration
class MyBackendService {
  private rewards: NEARProtocolRewardsSDK;
  
  constructor() {
    this.rewards = new NEARProtocolRewardsSDK({
      // config
    });
    
    // Start tracking on service initialization
    this.rewards.startTracking();
  }
}
```

2.Serverless Function

```typescript
// AWS Lambda example
export const handler = async (event) => {
  const rewards = new NEARProtocolRewardsSDK({
    // config
  });
  
  // Track activity for this execution
  await rewards.trackActivity();
};
```

3.GitHub Action

```yaml
name: Track NEAR Protocol Rewards
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
jobs:
  track:
    runs-on: ubuntu-latest
    steps:
      - uses: near-protocol/rewards-tracker@v1
        with:
          project-id: ${{ secrets.PROJECT_ID }}
          near-account: ${{ secrets.NEAR_ACCOUNT }}
```

## Configuration Options

```typescript
interface SDKConfig {
  // Required
  projectId: string;
  nearAccount: string;
  githubRepo: string;
  
  // Optional
  trackingInterval?: number;    // How often to collect metrics (default: 6 hours)
  autoStart?: boolean;          // Start tracking immediately (default: true)
  customMetrics?: MetricConfig[]; // Additional metrics to track
  notifyOnMilestones?: boolean; // Get notifications for achievements
}
```

## Error Handling Best Practices

```typescript
try {
  const rewards = new NEARProtocolRewardsSDK({
    // config
  });
  
  // Handle specific errors
  rewards.on('error', (error) => {
    if (error instanceof TrackingError) {
      // Handle tracking issues
    }
    if (error instanceof ValidationError) {
      // Handle validation issues
    }
  });
  
  // Handle successful tracking
  rewards.on('tracked', (metrics) => {
    console.log('New metrics recorded:', metrics);
  });
} catch (error) {
  // Handle initialization errors
}
```

Additional Context:

1. The SDK should prioritize developer experience
2. Minimal configuration required to get started
3. Should work with various JavaScript/TypeScript frameworks
4. Automatic background tracking preferred over manual tracking
5. Clear error messages and debugging information
6. Typescript types for good IDE integration
7. Proper documentation and examples
8. Consideration for different deployment environments
