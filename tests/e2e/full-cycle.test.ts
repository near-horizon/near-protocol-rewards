import { GitHubRewardsSDK } from '../../src/sdk';
import { ProcessedMetrics } from '../../src/types/metrics';
import { BaseError } from '../../src/types/errors';

describe('Full Reward Cycle E2E', () => {
  let sdk: GitHubRewardsSDK;

  beforeAll(() => {
    // Skip all tests if no GitHub token is provided
    if (!process.env.GITHUB_TOKEN) {
      console.warn('Skipping E2E tests: GITHUB_TOKEN not provided');
      return;
    }

    sdk = new GitHubRewardsSDK({
      githubToken: process.env.GITHUB_TOKEN || 'invalid-token',
      githubRepo: process.env.TEST_GITHUB_REPO || 'test-org/test-repo',
      isTestMode: true
    });
  });

  afterAll(async () => {
    if (sdk) {
      await sdk.stopTracking();
    }
  });

  // Skip individual tests if no GitHub token
  const testIfToken = process.env.GITHUB_TOKEN ? it : it.skip;

  testIfToken('should complete a full reward cycle', async () => {
    const metricsPromise = new Promise<ProcessedMetrics>((resolve) => {
      sdk.on('metrics:collected', resolve);
    });

    await sdk.startTracking();
    const metrics = await metricsPromise;

    expect(metrics).toBeDefined();
    expect(metrics.github).toBeDefined();
    expect(metrics.score).toBeDefined();
    expect(metrics.score.total).toBeGreaterThanOrEqual(0);
    expect(metrics.score.total).toBeLessThanOrEqual(100);
  }, 60000);

  testIfToken('should handle reward cycle edge cases', async () => {
    const metrics = await sdk.getMetrics();
    expect(metrics).not.toBeNull();
    if (!metrics) {
      throw new Error('Metrics should not be null');
    }
    expect(metrics.score.total).toBeGreaterThanOrEqual(0);
  });

  testIfToken('should maintain reward constraints', async () => {
    const metrics = await sdk.getMetrics();
    expect(metrics).not.toBeNull();
    if (!metrics) {
      throw new Error('Metrics should not be null');
    }
    expect(metrics.score.total).toBeLessThanOrEqual(100);
    expect(metrics.score.breakdown).toBeDefined();
  });
}); 