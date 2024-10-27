# Quick Start Guide - NEAR Protocol Rewards SDK (Beta)

## Prerequisites

- Node.js 16 or higher
- A GitHub account and repository
- A NEAR testnet account

## Installation

```bash
npm install near-protocol-rewards
```

## Recommended Implementation

1. Create a new file `rewards-tracker.ts` (or .js):

```typescript
// rewards-tracker.ts
import { NEARProtocolRewardsSDK } from 'near-protocol-rewards';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'PROJECT_ID',
  'NEAR_ACCOUNT',
  'GITHUB_REPO',
  'GITHUB_TOKEN'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

export class RewardsTracker {
  private sdk: NEARProtocolRewardsSDK;

  constructor() {
    this.sdk = new NEARProtocolRewardsSDK({
      projectId: process.env.PROJECT_ID!,
      nearAccount: process.env.NEAR_ACCOUNT!,
      githubRepo: process.env.GITHUB_REPO!,
      githubToken: process.env.GITHUB_TOKEN!,
      storage: process.env.POSTGRES_HOST ? {
        type: 'postgres',
        config: {
          host: process.env.POSTGRES_HOST,
          port: parseInt(process.env.POSTGRES_PORT || '5432'),
          database: process.env.POSTGRES_DB || 'near_rewards',
          user: process.env.POSTGRES_USER || 'postgres',
          password: process.env.POSTGRES_PASSWORD || 'postgres'
        }
      } : undefined
    });

    // Setup event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for new metrics
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

    // Handle errors
    this.sdk.on('error', (error) => {
      console.error('Error in rewards tracking:', {
        code: error.code,
        message: error.message,
        context: error.context
      });
    });
  }

  async start(): Promise<void> {
    try {
      await this.sdk.startTracking();
      console.log('Rewards tracking started successfully');
    } catch (error) {
      console.error('Failed to start rewards tracking:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    await this.sdk.stopTracking();
    console.log('Rewards tracking stopped');
  }
}
```

Create a `.env` file:

```env
# Required
PROJECT_ID=my-project
NEAR_ACCOUNT=your-account.testnet
GITHUB_REPO=owner/repo
GITHUB_TOKEN=your_github_token

# Optional: PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=near_rewards
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
```

Usage in your application:

```typescript
// index.ts or app.ts
import { RewardsTracker } from './rewards-tracker';

async function main() {
  const tracker = new RewardsTracker();
  
  // Handle application shutdown
  process.on('SIGINT', async () => {
    await tracker.stop();
    process.exit(0);
  });

  // Start tracking
  await tracker.start();
}

main().catch(console.error);
```

## Configuration Options

```typescript
interface SDKConfig {
  projectId: string;          // Required: Unique project identifier
  nearAccount: string;        // Required: NEAR account (e.g., "account.testnet")
  githubRepo: string;         // Required: GitHub repo (e.g., "owner/repo")
  githubToken: string;        // Required: GitHub personal access token
  storage?: {                 // Optional: PostgreSQL storage configuration
    type: 'postgres';
    config: {
      host: string;
      port: number;
      database: string;
      user: string;
      password: string;
    };
  };
  trackingInterval?: number;  // Optional: Interval in ms (default: 6 hours)
}
```

## Common Issues

- Ensure GitHub token has required permissions (repo scope)
- NEAR account must be valid and accessible
- PostgreSQL connection requires proper credentials

For more details:

- [API Reference](./api-reference.md)
- [Error Codes](./api-reference.md#error-codes)
- [Examples](../examples/)
