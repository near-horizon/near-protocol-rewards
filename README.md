# NEAR Protocol Rewards SDK

<div align="center">

  <p align="center">A transparent, metric-based rewards system for NEAR Protocol projects that directly ties incentives to development activity and user adoption.</p>

  <div align="center">

  [![npm version](https://badge.fury.io/js/near-protocol-rewards.svg)](https://badge.fury.io/js/near-protocol-rewards)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Dependencies](https://img.shields.io/librariesio/release/npm/near-protocol-rewards)](https://libraries.io/npm/near-protocol-rewards)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)


  </div>
</div>

## 🎯 Purpose

The NEAR Protocol Rewards SDK helps projects implement a fair and transparent rewards system by:

- **Tracking Development Activity**: Automatically collect and validate GitHub metrics like commits, PRs, and community engagement
- **Measuring User Adoption**: Monitor on-chain metrics like transactions, contract usage, and user growth
- **Calculating Fair Rewards**: Use weighted metrics to determine reward distributions based on actual project impact
- **Providing Transparency**: Real-time dashboard showing how rewards are calculated and distributed

## 🚀 Quick Start

```bash
# Install the SDK
npm install near-protocol-rewards

# Initialize in your project
import { NEARProtocolRewardsSDK } from 'near-protocol-rewards';

const sdk = new NEARProtocolRewardsSDK({
  projectId: 'your-project-id',
  nearAccount: 'your-project.near',
  githubRepo: 'org/repo',
  githubToken: 'your-github-token'
});

// Start tracking metrics
await sdk.startTracking();
```

## 📊 Key Features

### Development Metrics

- Commit frequency and quality
- Pull request activity
- Community engagement
- Code review participation

### Adoption Metrics

- Transaction volume
- Contract usage
- User growth
- Network activity

### Real-time Dashboard

- Activity monitoring
- Performance trends
- Integration status
- Validation checks

### Automated Rewards

- Fair distribution based on metrics
- Transparent calculations
- Customizable weights
- Historical tracking

## 💻 Developer Dashboard

Access your metrics through our intuitive dashboard:

```typescript
// Set up the dashboard in your app
import { Dashboard } from 'near-protocol-rewards/components';

function App() {
  return (
    <Dashboard
      projectId="your-project-id"
      refreshInterval={300000} // 5 minutes
    />
  );
}
```

## 🔧 Configuration

Customize the SDK to match your project's needs:

```typescript
const sdk = new NEARProtocolRewardsSDK({
  // Required
  projectId: 'your-project-id',
  nearAccount: 'your-project.near',
  githubRepo: 'org/repo',
  githubToken: 'your-github-token',
  
  // Optional
  weights: {
    github: {
      commits: 0.4,
      pullRequests: 0.3,
      communityEngagement: 0.3
    },
    near: {
      transactionVolume: 0.4,
      contractUsage: 0.3,
      userGrowth: 0.3
    }
  },
  
  // Validation thresholds
  validation: {
    github: {
      minCommits: 1,
      maxCommitsPerDay: 50
    },
    near: {
      minTransactions: 1,
      maxTransactionsPerDay: 1000
    }
  }
});
```

## 📈 Example Usage

```typescript
// Listen for metric updates
sdk.on('metrics:collected', (metrics) => {
  console.log('New metrics:', metrics);
  
  // Example metrics structure:
  {
    github: {
      commits: { count: 23, frequency: 3.2 },
      pullRequests: { merged: 12, open: 5 },
      community: { contributors: 8, engagement: 0.75 }
    },
    near: {
      transactions: { count: 1250, volume: "5000" },
      contracts: { calls: 850, uniqueUsers: 120 }
    },
    score: {
      total: 85,
      breakdown: {
        development: 0.8,
        adoption: 0.9
      }
    }
  }
});

// Get current metrics
const metrics = await sdk.getMetrics();

// Get historical data
const history = await sdk.getMetricsHistory({
  startTime: Date.now() - (30 * 24 * 60 * 60 * 1000), // 30 days ago
  endTime: Date.now()
});
```

## 🛠 Installation

1. Install the package:

```bash
npm install near-protocol-rewards
# or
yarn add near-protocol-rewards
```

2. Set up environment variables:

```env
NEAR_ACCOUNT=your-project.near
GITHUB_REPO=org/repo
GITHUB_TOKEN=your-token
```

3. Initialize the SDK in your project

## 📖 Documentation

- [API Reference](docs/api-reference.md)
- [Configuration Guide](docs/configuration.md)
- [Dashboard Components](docs/components.md)
- [Metrics & Calculations](docs/metrics.md)

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT © [NEAR Protocol](LICENSE)

## 🔗 Links

- [NEAR Protocol](https://near.org)
- [Documentation](https://docs.near.org)
- [Discord Community](https://near.chat)
