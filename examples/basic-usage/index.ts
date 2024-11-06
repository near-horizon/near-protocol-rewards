import { NEARProtocolRewardsSDK } from 'near-protocol-rewards';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const sdk = new NEARProtocolRewardsSDK({
    projectId: process.env.PROJECT_ID!,
    nearAccount: process.env.NEAR_ACCOUNT!,
    githubRepo: process.env.GITHUB_REPO!,
    githubToken: process.env.GITHUB_TOKEN!
  });

  // Listen for metrics
  sdk.on('metrics:collected', (metrics) => {
    console.log('New metrics:', {
      github: metrics.github,
      near: metrics.near,
      score: metrics.score
    });
  });

  // Listen for rewards
  sdk.on('reward:calculated', (reward) => {
    console.log('Reward calculated:', {
      score: reward.score,
      usdAmount: reward.rewards.usdAmount,
      nearAmount: reward.rewards.nearAmount
    });
  });

  await sdk.startTracking();
}

main().catch(console.error); 