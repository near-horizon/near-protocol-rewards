import { NEARProtocolRewardsSDK } from '../src'; // Fix import path for development
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  // 1. Basic setup with clear error handling
  try {
    const sdk = new NEARProtocolRewardsSDK({
      projectId: 'my-first-near-project',
      nearAccount: process.env.NEAR_ACCOUNT!,
      githubRepo: 'myorg/myrepo',
      githubToken: process.env.GITHUB_TOKEN!
    });

    // 2. Listen for events with meaningful logging
    sdk.on('metrics:collected', (metrics) => {
      console.log('✅ New metrics collected:');
      console.log('GitHub Activity:', {
        commits: metrics.github.commits.count,
        prs: metrics.github.pullRequests.merged,
        contributors: metrics.github.commits.authors.length
      });
      console.log('NEAR Activity:', {
        transactions: metrics.near.transactions.count,
        volume: metrics.near.transactions.volume,
        users: metrics.near.transactions.uniqueUsers.length
      });
    });

    // 3. Handle errors properly
    sdk.on('error', (error) => {
      console.error('❌ Error:', error.message);
      if (error.context) {
        console.error('Context:', error.context);
      }
    });

    // 4. Start tracking with clear feedback
    console.log('🚀 Starting metrics tracking...');
    await sdk.startTracking();

    // 5. Get metrics with proper method name
    const metrics = await sdk.getMetrics();
    console.log('📊 Current metrics:', metrics);

  } catch (error) {
    console.error('Failed to initialize SDK:', error);
    process.exit(1);
  }
}

main().catch(console.error);
