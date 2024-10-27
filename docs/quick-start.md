# Quick Start Guide - NEAR Protocol Rewards SDK (Beta)

## Prerequisites
- Node.js 16 or higher
- A GitHub account and repository
- A NEAR testnet account

## Setup Steps

### 1. Install the SDK
```bash
npm install near-protocol-rewards
```

### 2. Set up Environment Variables
Create a `.env` file in your project root:
```env
# Required: Your GitHub personal access token
# Generate at: https://github.com/settings/tokens
GITHUB_TOKEN=your_github_token

# Required: Your NEAR testnet account
# Create at: https://wallet.testnet.near.org/
NEAR_ACCOUNT=your-account.testnet

# Optional: PostgreSQL configuration (if using storage)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=near_rewards
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
```

### 3. Initialize the SDK
```typescript
import { NEARProtocolRewardsSDK } from 'near-protocol-rewards';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const sdk = new NEARProtocolRewardsSDK({
  projectId: 'my-first-near-project',
  nearAccount: process.env.NEAR_ACCOUNT!,
  githubRepo: 'myorg/myrepo',
  githubToken: process.env.GITHUB_TOKEN!
});
```

### 4. Track Metrics
```typescript
// Listen for new metrics
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

// Handle errors
sdk.on('error', (error) => {
  console.error('Error:', error.message);
});

// Start tracking
await sdk.startTracking();
```

### 5. Get Current Metrics
```typescript
const metrics = await sdk.getMetrics();
console.log('Current metrics:', metrics);
```

## Common Issues & Solutions

### GitHub Rate Limiting
If you see GitHub API rate limit errors:
- Ensure your token has the correct permissions
- Consider increasing collection intervals
- Check your rate limit status at api.github.com/rate_limit

### NEAR API Issues
If you experience NEAR API connection issues:
- Verify your NEAR account exists
- Check network status at status.near.org
- Ensure you're using the correct network (testnet/mainnet)

## Next Steps
- Review the [API Reference](./api-reference.md) for advanced usage
- Join our [Discord](https://near.chat) for support
- Check out example projects in the `/examples` directory
