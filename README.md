# NEAR Protocol Rewards SDK

> A transparent, metric-based rewards system for NEAR projects that directly ties incentives to development activity and user adoption.

<div align="center">
  
  [![npm version](https://badge.fury.io/js/near-protocol-rewards.svg)](https://badge.fury.io/js/near-protocol-rewards)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

## 📚 Documentation

### Getting Started

- [Quick Start Guide](docs/quick-start.md) - Get started in minutes
- [Environment Variables](docs/environment-variables.md) - Configuration options
- [API Reference](docs/api-reference.md) - Detailed API documentation
- [API Examples](docs/api-examples.md) - Real-world usage examples

### Beta Testing Resources

- [Beta Testing Guide](docs/beta-testing.md) - Guide for beta testers
- [Beta Checklist](docs/beta-checklist.md) - Pre-testing requirements
- [Known Limitations](docs/quick-start.md#known-limitations-beta) - Current beta limitations
- [Testing Setup](tests/setup.ts) - Setup for testing

### Technical Documentation

- [Rewards System](docs/rewards.md) - How rewards are calculated
- [GitHub Actions Setup](docs/github-actions-setup.md) - CI/CD configuration
- [Architecture](docs/architecture.md) - Technical architecture

## 🚀 Quick Install

```bash
npm install near-protocol-rewards
```

## 🎯 Basic Usage

```typescript
import { NEARProtocolRewardsSDK } from 'near-protocol-rewards';

const sdk = new NEARProtocolRewardsSDK({
  projectId: 'your-project',
  nearAccount: 'your.near',
  githubRepo: 'org/repo',
  githubToken: process.env.GITHUB_TOKEN
});

// Listen for metrics
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

// Start tracking
await sdk.startTracking();
```

## 🔍 Features

### GitHub Activity Tracking

- Commit frequency and quality
- Pull request activity
- Community engagement
- Author diversity metrics

### NEAR Onchain Monitoring

- Transaction volume
- Contract usage
- User growth
- Price data integration

### Automated Rewards

- Fair distribution based on metrics
- Transparent calculations
- Historical tracking
- Secure validation

## 🛠️ Beta Testing

We're currently in beta testing. To participate:

1. Review the [Beta Testing Guide](docs/beta-testing.md)
2. Complete the [Beta Testing Checklist](docs/beta-checklist.md)
3. Join our [Discord](https://near.chat) for support

### Prerequisites

- Node.js 16+
- PostgreSQL database
- GitHub account with API token
- NEAR testnet account

## 💻 Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

## 🤝 Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md).

## 🔗 Resources

- [NEAR Protocol](https://near.org)
- [Documentation](https://docs.near.org)
- [Discord Community](https://near.chat)
- [GitHub Issues](https://github.com/near/protocol-rewards/issues)

## 📄 License

MIT © [NEAR Protocol](LICENSE)
