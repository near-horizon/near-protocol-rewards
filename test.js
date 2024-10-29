const { NEARProtocolRewardsSDK } = require('near-protocol-rewards');

async function test() {
  const sdk = new NEARProtocolRewardsSDK({
    projectId: 'test-project',
    nearAccount: process.env.NEAR_ACCOUNT,
    githubRepo: process.env.GITHUB_REPO,
    githubToken: process.env.GITHUB_TOKEN
  });

  sdk.on('metrics:collected', (metrics) => {
    console.log('Metrics:', metrics);
  });

  await sdk.startTracking();
}

test().catch(console.error); 