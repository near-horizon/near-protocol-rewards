import { GitHubRewardsSDK } from '../../src/sdk';
import { ProcessedMetrics } from '../../src/types/metrics';
import { integrationConfig } from './config';

describe('SDK Integration', () => {
  let sdk: GitHubRewardsSDK;

  beforeEach(() => {
    sdk = new GitHubRewardsSDK({
      githubToken: integrationConfig.githubToken || 'test-token',
      githubRepo: integrationConfig.githubRepo,
      isTestMode: true
    });
  });

  it('should handle invalid configuration', () => {
    expect(() => {
      new GitHubRewardsSDK({
        githubToken: '',
        githubRepo: 'invalid-repo-format',
        isTestMode: true
      });
    }).toThrow();
  });
});
