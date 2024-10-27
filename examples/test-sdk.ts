import { NEARProtocolRewardsSDK } from '../src';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

async function testSDK() {
  // Validate required environment variables
  const requiredEnvVars = [
    'PROJECT_ID',
    'NEAR_ACCOUNT',
    'GITHUB_REPO',
    'GITHUB_TOKEN',
    'POSTGRES_HOST',
    'POSTGRES_PORT',
    'POSTGRES_DB',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  // Initialize SDK with test configuration
  const sdk = new NEARProtocolRewardsSDK({
    projectId: process.env.PROJECT_ID!,
    nearAccount: process.env.NEAR_ACCOUNT!,
    githubRepo: process.env.GITHUB_REPO!,
    githubToken: process.env.GITHUB_TOKEN!,
    storage: {
      type: 'postgres' as const,
      config: {
        host: process.env.POSTGRES_HOST!,
        port: parseInt(process.env.POSTGRES_PORT!, 10),
        database: process.env.POSTGRES_DB!,
        user: process.env.POSTGRES_USER!,
        password: process.env.POSTGRES_PASSWORD!
      }
    }
  });

  // Listen for events
  sdk.on('metrics:collected', (metrics) => {
    console.log('📊 New metrics collected:', JSON.stringify(metrics, null, 2));
  });

  sdk.on('error', (error) => {
    console.error('❌ Error:', error);
  });

  try {
    // Start tracking
    console.log('🚀 Starting metrics tracking...');
    await sdk.startTracking();

    // Wait for initial collection
    console.log('⏳ Waiting for initial collection...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Get latest metrics using the correct method name
    const metrics = await sdk.getMetrics(process.env.PROJECT_ID!);
    console.log('📈 Latest metrics:', JSON.stringify(metrics, null, 2));

    // Wait for more collections
    console.log('⏳ Waiting for more collections...');
    await new Promise(resolve => setTimeout(resolve, 50000));

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up...');
    await sdk.cleanup();
  }
}

// Run the test if called directly
if (require.main === module) {
  console.log('🏃 Starting SDK test...');
  testSDK().catch(console.error);
}

export { testSDK };
