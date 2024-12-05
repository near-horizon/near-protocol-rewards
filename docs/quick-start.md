# Quick Start Guide

## Installation

One command is all you need:

```bash
npx near-protocol-rewards init
```

This will:

1. Create a GitHub Actions workflow file
2. Configure automatic metrics collection
3. Set up your repository for rewards tracking

## What's Next?

1. Your metrics will start being collected automatically
2. View them at [Protocol Rewards Dashboard](https://protocol-rewards-dashboard.vercel.app/)
3. Login with your GitHub account to see your project's metrics

## GitHub Token

The SDK uses your repository's built-in GitHub token (`GITHUB_TOKEN`), which is automatically available in GitHub Actions. You don't need to configure anything!

## Customization

Want to adjust how often metrics are collected? Edit `.github/workflows/near-rewards.yml`:

```yaml
name: NEAR Protocol Rewards Tracking
on:
  schedule:
    - cron: '*/5 * * * *'  # Adjust this for different frequency
  workflow_dispatch:        # Manual trigger
  push:
    branches: [ main ]     # Trigger on push

jobs:
  track-metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Run Metrics Collection
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_REPO: ${{ github.repository }}
        run: npx near-protocol-rewards track
```

## Advanced Usage

Need more control? Use the SDK programmatically:

```typescript
import { NEARProtocolRewardsSDK } from 'near-protocol-rewards';

const sdk = new NEARProtocolRewardsSDK({
  githubRepo: 'your-org/repo',
  githubToken: process.env.GITHUB_TOKEN
});

await sdk.startTracking();
const metrics = await sdk.getMetrics();
console.log(metrics);
```

## Need Help?

- [View Documentation](https://github.com/jbarnes850/near-protocol-rewards#readme)
- [Report Issues](https://github.com/jbarnes850/near-protocol-rewards/issues)
- [Dashboard Repository](https://github.com/jbarnes850/protocol-rewards-dashboard)
