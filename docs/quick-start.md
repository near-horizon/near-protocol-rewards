# Quick Start Guide - NEAR Protocol Rewards SDK (Beta)

## Prerequisites

- Node.js 14 or higher
- A GitHub account and repository
- GitHub Personal Access Token with repo scope

## Installation

```bash
npm install near-protocol-rewards
```

## Basic Implementation

1. Create a new file `rewards-tracker.ts` (or .js):

```typescript
// rewards-tracker.ts
import { NEARProtocolRewardsSDK } from 'near-protocol-rewards';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
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
      githubRepo: process.env.GITHUB_REPO!,
      githubToken: process.env.GITHUB_TOKEN!,
      timeframe: 'week',  // 'day' | 'week' | 'month'
      weights: {
        commits: 0.35,
        pullRequests: 0.25,
        reviews: 0.20,
        issues: 0.20
      }
    });

    // Setup event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for new metrics
    this.sdk.on('metrics:collected', (metrics) => {
      console.log('New metrics collected:', {
        commits: metrics.github.commits.count,
        prs: metrics.github.pullRequests.merged,
        reviews: metrics.github.reviews.count,
        issues: metrics.github.issues.closed,
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
GITHUB_REPO=owner/repo
GITHUB_TOKEN=your_github_token

# Optional
LOG_LEVEL=info
MAX_REQUESTS_PER_SECOND=5
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
  githubRepo: string;          // Required: GitHub repo (e.g., "owner/repo")
  githubToken: string;         // Required: GitHub personal access token
  timeframe?: 'day' | 'week' | 'month';  // Optional: default 'week'
  logLevel?: 'debug' | 'info' | 'warn' | 'error';  // Optional: default 'info'
  maxRequestsPerSecond?: number;  // Optional: default 5
  weights?: {  // Optional
    commits?: number;
    pullRequests?: number;
    reviews?: number;
    issues?: number;
  }
}
```

## Common Issues

- Ensure GitHub token has required permissions (repo scope)
- Check rate limiting settings if experiencing API issues
- Verify repository name format (owner/repo)

For more details:

- [Architecture Overview](./architecture.md)
- [Rewards System](./rewards.md)
