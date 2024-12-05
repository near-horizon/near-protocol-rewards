# NEAR Protocol Rewards SDK

> A transparent, metric-based rewards system for NEAR projects that directly ties incentives to development activity.

<div align="center">
  
  [![npm version](https://img.shields.io/npm/v/near-protocol-rewards.svg)](https://www.npmjs.com/package/near-protocol-rewards)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/jbarnes850/near-protocol-rewards/blob/main/CONTRIBUTING.md)

</div>

## What is Protocol Rewards?

Protocol Rewards is a developer-first funding solution for the NEAR ecosystem. We're solving a critical challenge in Web3: how to transform traditional one-time grants into sustainable, ongoing capital for developers - where funding automatically grows with their impact and contribution to NEAR.

### The Problem

- Traditional funding models (grants, VCs) require extensive time spent on proposals and pitches
- Developers want to focus on building, not fundraising
- Project impact is often measured subjectively
- Funding is typically front-loaded rather than tied to ongoing development

### Our Solution

Protocol Rewards provides:

- Automated tracking of development metrics and project impact
- Merit-based rewards tied directly to contributions
- Transparent, objective criteria for funding
- Sustainable, ongoing rewards that scale with project growth

By automating the entire process from tracking to distribution, we enable developers to focus
on what they do best - building innovative solutions on NEAR.

## Getting Started in One Step

```bash
npx near-protocol-rewards init
```

That's it! This command will:

1. Set up automatic metrics collection via GitHub Actions
2. Configure your repository for rewards tracking
3. Start collecting metrics every 5 minutes

Your metrics will be available at [Protocol Rewards Dashboard](https://protocol-rewards-dashboard.vercel.app/) - just login with GitHub to view them!

See our dashboard repo for more details: [protocol-rewards-dashboard](https://github.com/jbarnes850/protocol-rewards-dashboard).

## How It Works

The SDK runs as a GitHub Action in your repository:

- Collects metrics every 5 minutes
- Uses your repository's built-in GitHub token
- No infrastructure or setup needed
- Runs completely in GitHub's cloud

![Architecture](public/assets/architecture.png)

## Documentation

- [Quick Start Guide](https://github.com/jbarnes850/near-protocol-rewards/blob/main/docs/quick-start.md)
- [Architecture Overview](https://github.com/jbarnes850/near-protocol-rewards/blob/main/docs/architecture.md)

## Advanced Usage

If you need more control, you can still use the SDK programmatically:

```typescript
import { NEARProtocolRewardsSDK } from 'near-protocol-rewards';

const sdk = new NEARProtocolRewardsSDK({
  githubRepo: 'your-org/repo',
  githubToken: process.env.GITHUB_TOKEN
});

await sdk.startTracking();
```

## Configuration

The GitHub Action can be customized by editing `.github/workflows/near-rewards.yml`:

```yaml
name: NEAR Protocol Rewards Tracking
on:
  schedule:
    - cron: '*/5 * * * *'  # Adjust frequency
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

## Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/jbarnes850/near-protocol-rewards/blob/main/CONTRIBUTING.md).

## License

MIT © [NEAR Protocol](https://github.com/jbarnes850/near-protocol-rewards/blob/main/LICENSE)
