# NEAR Protocol Rewards SDK Architecture

## Component Overview

### Core SDK Components

1. **Metrics Processor**
   - Handles GitHub metrics collection
   - Calculates reward scores
   - Determines achievement levels
   - Currently focused on GitHub activity (see [v0.4.0 roadmap](roadmap.md) for NEAR transaction integration)

2. **Validation Layer**
   - Input validation
   - Anti-gaming checks
   - Activity thresholds
   - Coming in v0.4.0: Multi-contributor validation

3. **Data Collection Layer**
   - GitHub API integration
   - Rate limiting management
   - Data normalization
   - Future: Multi-platform support ([roadmap](roadmap.md))

### Dashboard Components (Separate Repository)

1. **Developer Dashboard**
   - Real-time metrics display
   - Achievement tracking
   - Progress visualization
   - OAuth authentication

2. **Data Storage**
   - Metrics persistence
   - Historical tracking
   - Analytics data
   - Future: Multi-repository aggregation

## Data Flow

1. **Collection**

```typescript
// GitHub metrics collection via SDK
const metrics = await sdk.getMetrics();
```

2. **Validation & Processing**

```typescript
// Automatic validation and reward calculation
const rewards = calculator.calculateRewards(metrics.github, 'week');
```

3. **Results Display**

```typescript
// CLI output format
logger.info(`🏆 Level: ${rewards.level.name} (${rewards.score.total.toFixed(2)}/100)`);
logger.info(`💰 Weekly Reward: $${weeklyReward.toLocaleString()}`);
```

## Error Handling

```typescript
try {
  const metrics = await sdk.getMetrics();
} catch (error) {
  if (error instanceof BaseError) {
    logger.error('Failed to calculate rewards:', { 
      message: error.message, 
      details: error.details 
    });
  }
}
```

## Best Practices

1. **Security**
   - Use GitHub Actions for automated rewards calculation
   - Leverage GitHub's built-in security
   - Never expose tokens in logs

2. **Performance**
   - Respect API rate limits
   - Cache metrics where possible
   - Batch process updates

3. **Reliability**
   - Validate all inputs
   - Handle missing data gracefully
   - Clear error messaging


## Integration Guide

For implementation details, see:

- [Quick Start Guide](quick-start.md)
- [Troubleshooting Guide](troubleshooting.md)
- [Dashboard Guide](dashboard.md)
