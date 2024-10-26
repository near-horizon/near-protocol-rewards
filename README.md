# NEAR Protocol Rewards SDK

[![npm version](https://badge.fury.io/js/near-protocol-rewards.svg)](https://www.npmjs.com/package/near-protocol-rewards)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An analytics SDK for tracking and calculating rewards for projects building on NEAR. This SDK automatically monitors GitHub development activity and NEAR blockchain interactions to provide transparent, real-time metrics and rewards calculations.

## 🚀 Features

- **Automated Metrics Collection**:
  - GitHub activity tracking (commits, PRs, issues)
  - NEAR blockchain monitoring (transactions, contract calls)
  - Real-time data validation
- **Advanced Analytics**:
  - Weighted scoring system
  - User growth tracking
  - Community engagement metrics
- **Data Validation & Security**:
  - Comprehensive error handling
  - Rate limiting for API calls
  - Data integrity checks
- **Storage & Persistence**:
  - PostgreSQL integration
  - Historical data tracking
  - Efficient querying
- **Developer Dashboard**:
  - Real-time metrics visualization
  - Activity feeds
  - Integration status monitoring

## 📦 Installation

```bash
npm install near-protocol-rewards
# or
yarn add near-protocol-rewards
```

## 🔧 Quick Start

```typescript
import { NEARProtocolRewardsSDK } from 'near-protocol-rewards';

// Initialize the SDK
const sdk = new NEARProtocolRewardsSDK({
  projectId: 'my-project',
  nearAccount: 'myproject.near',
  githubRepo: 'myorg/myproject',
  githubToken: process.env.GITHUB_TOKEN,
  logLevel: 'info'
});

// Start tracking
await sdk.startTracking();

// Get metrics
const metrics = await sdk.getMetrics();
console.log('Project Score:', metrics.score.total);
```

## 📊 Metrics & Validation

### GitHub Metrics

```typescript
interface GitHubMetrics {
  commits: {
    count: number;
    frequency: number;
    authors: string[];
  };
  pullRequests: {
    open: number;
    merged: number;
    authors: string[];
  };
  issues: {
    open: number;
    closed: number;
    participants: string[];
  };
  metadata: {
    collectionTimestamp: number;
    repoDetails: {
      stars: number;
      forks: number;
    };
  };
}
```

### NEAR Chain Metrics

```typescript
interface NEARMetrics {
  transactions: {
    count: number;
    volume: string;
    uniqueUsers: string[];
  };
  contract: {
    calls: number;
    uniqueCallers: string[];
  };
  metadata: {
    collectionTimestamp: number;
    blockHeight: number;
  };
}
```

## 💾 Data Storage

The SDK uses PostgreSQL for persistent storage. Configure your database connection:

```typescript
const sdk = new NEARProtocolRewardsSDK({
  // ... other config
  storage: {
    host: 'localhost',
    port: 5432,
    database: 'near_rewards',
    user: 'postgres',
    password: 'your-password'
  }
});
```

## 🌐 API Server

Start the API server to expose metrics endpoints:

```typescript
import { APIServer } from 'near-protocol-rewards/api';

const server = new APIServer({
  port: 3000,
  storage: sdk.storage,
  calculator: sdk.calculator,
  logger: sdk.logger
});

await server.start();
```

Available endpoints:

- `GET /api/v1/projects/:projectId/metrics/current`
- `GET /api/v1/projects/:projectId/metrics/history`
- `GET /api/v1/projects/:projectId/status`
- `GET /api/v1/projects/:projectId/validation`

## 📈 Dashboard Integration

```typescript
import { DashboardLayout, MetricsCard, ActivityFeed } from 'near-protocol-rewards/components';

function Dashboard() {
  const { metrics, activities, integrations } = useDashboard({
    projectId: 'my-project'
  });

  return (
    <DashboardLayout>
      <MetricsCard 
        title="GitHub Activity"
        value={metrics.github.commits.count}
        change={metrics.score.breakdown.githubActivity}
        data={metrics.history.githubActivity}
      />
      <ActivityFeed activities={activities} />
    </DashboardLayout>
  );
}
```

## ⚙️ Configuration Options

```typescript
interface SDKConfig {
  // Required
  projectId: string;
  nearAccount: string;
  githubRepo: string;
  githubToken: string;

  // Optional
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  trackingInterval?: number; // milliseconds
  storage?: PostgresConfig;
  validation?: {
    github?: GitHubValidatorConfig;
    near?: NEARValidatorConfig;
  };
  weights?: {
    github?: MetricsWeights;
    near?: MetricsWeights;
  };
}
```

## 🔍 Error Handling

```typescript
sdk.on('error', (error) => {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
  } else if (error instanceof CollectionError) {
    console.error('Data collection failed:', error.message);
  } else if (error instanceof APIError) {
    console.error('API request failed:', error.message);
  }
});

sdk.on('metrics:collected', (metrics) => {
  console.log('New metrics collected:', metrics);
});
```

## 📝 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🆘 Support

- Documentation: [docs.near.org](https://docs.near.org)
- Discord: [NEAR Discord](https://near.chat)
- GitHub Issues: [Create an issue](https://github.com/near/protocol-rewards/issues)
