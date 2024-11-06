# SDK Implementation Examples

## Basic Usage

```typescript
import { NEARProtocolRewardsSDK } from 'near-protocol-rewards';

const sdk = new NEARProtocolRewardsSDK({
  projectId: 'my-project',
  nearAccount: 'project.near',
  githubRepo: 'org/repo',
  githubToken: process.env.GITHUB_TOKEN
});

// Handle metrics collection
sdk.on('metrics:collected', (metrics) => {
  console.log('New metrics:', {
    github: {
      commits: metrics.github.commits.count,
      prs: metrics.github.pullRequests.merged,
      contributors: metrics.github.commits.authors.length
    },
    near: {
      transactions: metrics.near.transactions.count,
      volume: metrics.near.transactions.volume,
      users: metrics.near.transactions.uniqueUsers.length
    }
  });
});

// Handle rewards
sdk.on('reward:calculated', (reward) => {
  console.log('Reward Details:', {
    score: reward.score.total,
    usdAmount: reward.rewards.usdAmount,
    nearAmount: reward.rewards.nearAmount
  });
});

await sdk.startTracking();
```

## With PostgreSQL Storage

```typescript
const sdk = new NEARProtocolRewardsSDK({
  projectId: 'my-project',
  nearAccount: 'project.near',
  githubRepo: 'org/repo',
  githubToken: process.env.GITHUB_TOKEN,
  storage: {
    type: 'postgres',
    config: {
      host: process.env.DB_HOST!,
      port: parseInt(process.env.DB_PORT!),
      database: process.env.DB_NAME!,
      user: process.env.DB_USER!,
      password: process.env.DB_PASSWORD!
    }
  }
});

// Metrics will be automatically stored
await sdk.startTracking();

// Retrieve latest metrics
const latestMetrics = await sdk.getMetrics();
```

## Error Handling

```typescript
const sdk = new NEARProtocolRewardsSDK({
  // ... config
});

// Handle specific errors
sdk.on('error', (error) => {
  switch (error.code) {
    case 'API_ERROR':
      console.error('API request failed:', error.message);
      break;
    case 'RATE_LIMIT_ERROR':
      console.error('Rate limit exceeded:', error.message);
      break;
    case 'VALIDATION_ERROR':
      console.error('Validation failed:', error.message);
      break;
    default:
      console.error('Unknown error:', error);
  }
});

// Health check
const isHealthy = await sdk.healthCheck();
console.log('SDK Health:', isHealthy);
```

## Custom Configuration

```typescript
const sdk = new NEARProtocolRewardsSDK({
  projectId: 'my-project',
  nearAccount: 'project.near',
  githubRepo: 'org/repo',
  githubToken: process.env.GITHUB_TOKEN,
  // Custom intervals and limits
  trackingInterval: 30 * 60 * 1000, // 30 minutes
  maxRequestsPerSecond: 2,
  // Custom reward thresholds
  minRewardUsd: 500,
  maxRewardUsd: 5000
});
```

## Complete Implementation Example

```typescript
import { NEARProtocolRewardsSDK } from 'near-protocol-rewards';
import dotenv from 'dotenv';

dotenv.config();

class RewardsTracker {
  private sdk: NEARProtocolRewardsSDK;

  constructor() {
    this.sdk = new NEARProtocolRewardsSDK({
      projectId: process.env.PROJECT_ID!,
      nearAccount: process.env.NEAR_ACCOUNT!,
      githubRepo: process.env.GITHUB_REPO!,
      githubToken: process.env.GITHUB_TOKEN!,
      storage: process.env.DB_HOST ? {
        type: 'postgres',
        config: {
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT || '5432'),
          database: process.env.DB_NAME!,
          user: process.env.DB_USER!,
          password: process.env.DB_PASSWORD!
        }
      } : undefined
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Track metrics
    this.sdk.on('metrics:collected', (metrics) => {
      console.log('New metrics collected:', {
        github: {
          commits: metrics.github.commits.count,
          prs: metrics.github.pullRequests.merged,
          contributors: metrics.github.commits.authors.length
        },
        near: {
          transactions: metrics.near.transactions.count,
          volume: metrics.near.transactions.volume,
          users: metrics.near.transactions.uniqueUsers.length
        },
        score: metrics.score
      });
    });

    // Track rewards
    this.sdk.on('reward:calculated', (reward) => {
      console.log('Reward calculated:', {
        score: reward.score.total,
        usdAmount: reward.rewards.usdAmount,
        nearAmount: reward.rewards.nearAmount
      });
    });

    // Handle errors
    this.sdk.on('error', (error) => {
      console.error('Error:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
    });
  }

  async start() {
    try {
      await this.sdk.startTracking();
      console.log('Tracking started');
    } catch (error) {
      console.error('Failed to start tracking:', error);
      process.exit(1);
    }
  }

  async stop() {
    await this.sdk.cleanup();
    console.log('Tracking stopped');
  }
}

// Usage
async function main() {
  const tracker = new RewardsTracker();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await tracker.stop();
    process.exit(0);
  });

  await tracker.start();
}

main().catch(console.error);
```

## Environment Variables

```env
# Required
PROJECT_ID=my-project
NEAR_ACCOUNT=your-account.near
GITHUB_REPO=org/repo
GITHUB_TOKEN=ghp_your_token

# Optional: PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=near_rewards
DB_USER=postgres
DB_PASSWORD=your_password
```
