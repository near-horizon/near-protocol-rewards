# NEAR Protocol Rewards System

## Overview
The NEAR Protocol Rewards SDK implements a transparent, metric-based rewards system that calculates rewards based on both GitHub development activity and NEAR blockchain usage.

## Reward Calculation

### Scoring Components

1. **GitHub Activity Score (50%)**
   - Commit Activity (40%)
     - Number of commits
     - Commit frequency
     - Author diversity
   - Pull Request Activity (30%)
     - Merged PRs
     - Open PRs
     - Author diversity
   - Issue Activity (30%)
     - Closed issues
     - Community engagement
     - Participant diversity

2. **NEAR Activity Score (50%)**
   - Transaction Volume (40%)
     - Number of transactions
     - USD volume
   - Contract Usage (30%)
     - Number of contract calls
     - Unique callers
   - User Growth (30%)
     - Unique users
     - User retention

### Reward Calculation Formula

```typescript
// Total Score (0-100)
totalScore = (githubScore + nearScore) / 2

// USD Reward
baseUsdReward = (totalScore / 100) * maximumUsdReward
finalUsdReward = Math.min(
  Math.max(baseUsdReward, minimumUsdReward),
  maximumUsdReward
)

// NEAR Reward
nearReward = finalUsdReward / currentNearPrice
```

### Thresholds and Limits

- Minimum Score Required: 10%
- Minimum USD Reward: $100
- Maximum USD Reward: $10,000
- Price Data Validity: 5 minutes

## Security Measures

### Reward Verification
All reward calculations include a cryptographic signature to prevent tampering:

```typescript
// Verify reward calculation
const isValid = rewardsVerification.verifyReward(reward, signature);
if (!isValid) {
  throw new Error('Invalid reward signature detected');
}
```

### Data Validation
- All metrics are validated before processing
- Timestamps are checked for freshness
- Price data is verified against multiple sources
- Activity metrics are cross-validated

### Rate Limiting
- GitHub API: 80 requests per minute
- NEAR API: 25 requests per minute
- Price updates: Every 5 minutes

## Implementation Example

```typescript
const sdk = new NEARProtocolRewardsSDK({
  projectId: 'your-project',
  nearAccount: 'your.near',
  githubRepo: 'org/repo',
  githubToken: process.env.GITHUB_TOKEN,
  security: {
    secretKey: process.env.REWARD_SECRET_KEY
  }
});

// Listen for reward calculations
sdk.on('reward:calculated', async (reward, signature) => {
  // Verify the reward calculation
  if (!sdk.verifyReward(reward, signature)) {
    console.error('Invalid reward detected');
    return;
  }

  console.log('Verified Reward:', {
    usdAmount: reward.usdAmount,
    nearAmount: reward.nearAmount,
    score: reward.score
  });
});
```

## Best Practices
1. Always verify reward signatures
2. Store reward calculations with their signatures
3. Implement rate limiting
4. Monitor for suspicious activity
5. Keep secret keys secure
