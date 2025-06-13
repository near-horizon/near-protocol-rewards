import { NEARProtocolRewardsSDK } from '../src/sdk';
import dotenv from 'dotenv';

// Load test environment
dotenv.config({ path: '.env.test' });

async function testMVP() {
  console.log('🚀 Starting MVP test...');
  
  const sdk = new NEARProtocolRewardsSDK({
    projectId: process.env.PROJECT_ID!,
    nearAccount: process.env.NEAR_ACCOUNT!,
    githubRepo: process.env.GITHUB_REPO!,
    githubToken: process.env.GITHUB_TOKEN!
  });

  // Listen for events
  sdk.on('metrics:collected', (metrics) => {
    console.log('✅ Metrics collected:', JSON.stringify(metrics, null, 2));
  });

  sdk.on('error', (error) => {
    console.error('❌ Error:', error);
  });

  try {
    console.log('📊 Starting metrics collection...');
    await sdk.startTracking();

    // Wait for first collection
    await new Promise(resolve => setTimeout(resolve, 6000));

    console.log('🧹 Cleaning up...');
    await sdk.cleanup();
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
console.log('🏃 Starting SDK MVP test...');
testMVP().catch(console.error);
