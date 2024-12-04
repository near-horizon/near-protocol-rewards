# NEAR Protocol Rewards SDK

> A transparent, metric-based rewards system for NEAR projects that directly ties incentives to development activity.

<div align="center">
  
  [![npm version](https://badge.fury.io/js/near-protocol-rewards.svg)](https://badge.fury.io/js/near-protocol-rewards)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

## 📚 Documentation

### Getting Started

- [Quick Start Guide](docs/quick-start.md) - Get started in minutes
- [Architecture Overview](docs/architecture.md) - Technical architecture
- [Rewards System](docs/rewards.md) - How rewards are calculated

## 🚀 Quick Install

```bash
npm install near-protocol-rewards
```

## 🎯 Basic Usage

```typescript
import { NEARProtocolRewardsSDK } from 'near-protocol-rewards';

const sdk = new NEARProtocolRewardsSDK({
  githubRepo: 'org/repo',
  githubToken: process.env.GITHUB_TOKEN,
  timeframe: 'week'  // 'day' | 'week' | 'month'
});

// Start tracking metrics
await sdk.startTracking();

// Listen for metrics updates
sdk.on('metrics:collected', (metrics) => {
  console.log('New metrics:', {
    commits: metrics.github.commits.count,
    prs: metrics.github.pullRequests.merged,
    reviews: metrics.github.reviews.count,
    issues: metrics.github.issues.closed
  });
});

// Handle errors
sdk.on('error', (error) => {
  console.error('Error:', error);
});
```

## 🔍 Features

### GitHub Activity Tracking

- Commit frequency and quality
- Pull request activity
- Code review participation
- Issue management
- Community engagement metrics
- Contributor diversity analysis

### Automated Rewards

- Fair distribution based on metrics
- Transparent calculations
- Historical tracking
- Secure validation

### Advanced Features

- Configurable scoring weights
- Custom validation rules
- Flexible timeframe options
- Rate limiting protection
- Comprehensive error handling

## ⚙️ Configuration

```typescript
interface SDKConfig {
  githubRepo: string;          // Required: "owner/repo" format
  githubToken: string;         // Required: GitHub API token
  timeframe?: 'day' | 'week' | 'month';  // Optional: default 'week'
  logLevel?: 'debug' | 'info' | 'warn' | 'error';  // Optional: default 'info'
  maxRequestsPerSecond?: number;  // Optional: default 5
  validation?: {  // Optional
    github?: {
      minCommits?: number;
      maxCommitsPerDay?: number;
      minAuthors?: number;
    }
  };
  weights?: {  // Optional
    commits?: number;
    pullRequests?: number;
    reviews?: number;
    issues?: number;
  }
}
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run unit tests (no GitHub token needed)
npm test

# Run all tests including integration tests
# Requires setting up .env.test with a valid GitHub token
SKIP_INTEGRATION_TESTS=false npm test

# Build
npm run build
```

### Testing

The test suite includes:
- Unit tests: No external dependencies, fully mocked
- Integration tests: Requires GitHub token (optional)
- E2E tests: Requires full configuration (optional)

To run integration tests:
1. Copy `.env.test.example` to `.env.test`
2. Add your GitHub token to `.env.test`
3. Set `SKIP_INTEGRATION_TESTS=false`
4. Run `npm test`

## 🤝 Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md).

## 🔗 Resources

- [GitHub Issues](https://github.com/jbarnes850/near-protocol-rewards/issues)

## 📄 License

MIT © [NEAR Protocol](LICENSE)
