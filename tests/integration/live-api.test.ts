import { GitHubRewardsSDK } from '../../src/sdk';
import { ProcessedMetrics } from '../../src/types/metrics';

const shouldSkipTests = process.env.SKIP_INTEGRATION_TESTS === 'true' || !process.env.GITHUB_TOKEN;

(shouldSkipTests ? describe.skip : describe)('Live API Integration', () => {
  it('should handle rate limits gracefully', async () => {
    const sdk = new GitHubRewardsSDK({
      githubToken: process.env.GITHUB_TOKEN || 'invalid-token',
      githubRepo: process.env.TEST_GITHUB_REPO || 'test-org/test-repo',
      isTestMode: true
    });

    const results = await Promise.allSettled([
      sdk.getMetrics()
    ]);

    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected'
    );

    expect(rejected.length).toBeGreaterThan(0);
    expect(rejected[0].reason).toBeDefined();
  });
}); 