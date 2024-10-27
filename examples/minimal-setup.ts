import { NEARProtocolRewardsSDK } from '../src';  // Use relative path during development
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const sdk = new NEARProtocolRewardsSDK({
    projectId: 'beta-test',
    nearAccount: process.env.NEAR_ACCOUNT!,
    githubRepo: process.env.GITHUB_REPO!,
    githubToken: process.env.GITHUB_TOKEN!
  });

  // Log all events
  sdk.on('metrics:collected', (metrics) => {
    console.log('📊 New metrics:', {
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

  sdk.on('error', (error) => {
    console.error('❌ Error:', error.message);
    if (error.context) {
      console.error('Context:', error.context);
    }
  });

  try {
    await sdk.startTracking();
    console.log('🚀 Tracking started');

    // Get initial metrics
    const metrics = await sdk.getMetrics('beta-test');
    console.log('📈 Initial metrics:', metrics);
  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { main };
