# NEAR Protocol Rewards System

## Overview

The NEAR Protocol Rewards SDK implements a transparent, metric-based rewards system that calculates rewards based on both GitHub development activity and NEAR onchain impact. We're implementing a 3-month pilot program to gather feedback and iterate on the system and allocated a total of $50,000 USD to be distributed over 3 months.

## Reward Structure (3-Month Pilot)

Total Pool: $50,000 USD (3 months)
Monthly Pool: $25,000 USD (flexible allocation)

### Reward Tiers

- Maximum Reward: $10,000 USD (90-100 points)
- High Impact: $7,500 USD (80-89 points)
- Significant Impact: $5,000 USD (70-79 points)
- Growing Impact: $2,500 USD (60-69 points)
- Good Progress: $1,000 USD (50-59 points)
- Early Traction: $500 USD (40-49 points)
- Getting Started: $250 USD (25-39 points)

## Scoring Components

1. **GitHub Activity Score (50%)**
   - Commit Activity (40%)
     - Target: 100+ quality commits/month
     - Author diversity considered
     - Commit frequency weighted
   - Pull Request Activity (30%)
     - Target: 20+ merged PRs/month
     - PR quality and size considered
     - Review engagement weighted
   - Issue Activity (30%)
     - Target: 30+ closed issues/month
     - Community engagement tracked
     - Issue quality weighted

2. **NEAR Activity Score (50%)**
   - Transaction Volume (40%)
     - Target: 10,000+ transactions/month
     - Volume Target: $1M+ monthly (~200K NEAR)
     - Transaction quality weighted
   - Contract Usage (30%)
     - Target: Regular contract interactions
     - Unique caller diversity
     - Usage patterns analyzed
   - User Growth (30%)
     - Target: 1,000+ unique users/month
     - User retention tracked
     - Growth rate weighted

## Reward Calculation

```typescript
// Score Calculation (0-100)
githubScore = (commitScore * 0.4) + (prScore * 0.3) + (issueScore * 0.3)
nearScore = (txScore * 0.4) + (volumeScore * 0.3) + (userScore * 0.3)
totalScore = (githubScore + nearScore) / 2

// Reward Calculation
baseUsdReward = Math.pow(totalScore/100, 1.5) * maximumUsdReward
finalUsdReward = Math.min(
  Math.max(baseUsdReward, minimumUsdReward),
  maximumUsdReward,
  remainingMonthlyPool
)

// NEAR Conversion
nearAmount = finalUsdReward / currentNearPrice
```

## Requirements for Maximum Reward ($10K)

### GitHub Requirements

- 100+ quality commits per month
- 20+ merged PRs
- 30+ closed issues
- Multiple active contributors
- Consistent activity pattern

### NEAR Requirements

- 10,000+ monthly transactions
- $1M+ monthly transaction volume
- 1,000+ unique users
- Active contract usage
- Growing user base

## Monthly Pool Management

- Monthly Limit: $25,000 USD
- Minimum Score Required: 25%
- Minimum Reward: $250 USD
- Rewards distributed on first-come, first-served basis
- Unused allocation may roll over within the 3-month pilot

## Security and Validation

### Reward Verification

```typescript
const isValid = rewardsVerification.verifyReward(reward, signature);
if (!isValid) {
  throw new Error('Invalid reward signature detected');
}
```

### Data Validation

- All metrics validated before processing
- Real-time price data verification
- Cross-validation of GitHub and NEAR metrics
- Anti-gaming measures implemented

### Rate Limiting

- GitHub API: 80 requests/minute
- NEAR API: 25 requests/minute
- Price updates: Every 5 minutes

## Best Practices

1. Maintain consistent development activity
2. Focus on quality over quantity
3. Encourage community engagement
4. Build sustainable user growth
5. Monitor metrics regularly
6. Keep activity natural and organic

## Implementation Example

```typescript
const sdk = new NEARProtocolRewardsSDK({
  projectId: 'your-project',
  nearAccount: 'your.near',
  githubRepo: 'org/repo',
  githubToken: process.env.GITHUB_TOKEN
});

sdk.on('reward:calculated', (calculation) => {
  console.log('Reward Details:', {
    score: calculation.score.total,
    usdAmount: calculation.rewards.usdAmount,
    nearAmount: calculation.rewards.nearAmount
  });
});
```
