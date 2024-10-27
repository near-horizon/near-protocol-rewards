# NEAR Protocol Rewards SDK

> A transparent, metric-based rewards system for NEAR Protocol projects that directly ties incentives to development activity and user adoption.

<div align="center">
  
  [![npm version](https://badge.fury.io/js/near-protocol-rewards.svg)](https://badge.fury.io/js/near-protocol-rewards)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

## 📚 Documentation

- [Quick Start Guide](docs/quick-start.md) - Get started in minutes
- [API Reference](docs/api-reference.md) - Detailed API documentation
- [Beta Testing Guide](docs/beta-testing.md) - Guide for beta testers
- [Known Limitations](docs/quick-start.md#known-limitations-beta) - Current beta limitations

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
  console.log('New metrics:', metrics);
});

// Start tracking
await sdk.startTracking();
```

## 🔍 Features

- **GitHub Activity Tracking**
  - Commit frequency and quality
  - Pull request activity
  - Community engagement

- **NEAR Chain Monitoring**
  - Transaction volume
  - Contract usage
  - User growth

- **Automated Rewards**
  - Fair distribution based on metrics
  - Transparent calculations
  - Historical tracking

## 🛠️ Beta Testing

We're currently in beta testing. To participate:

1. Review the [Beta Testing Guide](docs/beta-testing.md)
2. Check the [Beta Testing Checklist](docs/beta-checklist.md)
3. Join our [Discord](https://near.chat) for support

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

## 📄 License

MIT © [NEAR Protocol](LICENSE)

## 🔗 Links

- [NEAR Protocol](https://near.org)
- [Documentation](https://docs.near.org)
- [Discord Community](https://near.chat)
