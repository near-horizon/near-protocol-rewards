import { GitHubRewardsSDK } from '../../src/sdk';
import { ProcessedMetrics } from '../../src/types/metrics';
import { integrationConfig } from './config';
import { BaseError, ErrorCode } from '../../src/types/errors';

describe('SDK Integration', () => {
  let sdk: GitHubRewardsSDK;

  beforeEach(() => {
    sdk = new GitHubRewardsSDK({
      githubToken: process.env.GITHUB_TOKEN!,
      githubRepo: process.env.TEST_GITHUB_REPO!,
      isTestMode: true
    });
  });

  it('should validate GitHub token', async () => {
    if (!process.env.GITHUB_TOKEN) {
      console.warn('Skipping test: No GitHub token provided');
      return;
    }

    const testSdk = new GitHubRewardsSDK({
      githubToken: process.env.GITHUB_TOKEN,
      githubRepo: process.env.TEST_GITHUB_REPO || 'jbarnes850/near-protocol-rewards',
      isTestMode: true
    });

    await expect(testSdk.startTracking()).resolves.not.toThrow();
    console.log('✅ GitHub token is valid and has correct permissions');
  });

  it('should handle invalid configuration', () => {
    expect(() => {
      new GitHubRewardsSDK({
        githubToken: '',
        githubRepo: 'invalid-repo-format',
        isTestMode: true
      });
    }).toThrow(BaseError);
  });

  it('should initialize with valid configuration', () => {
    const validSdk = new GitHubRewardsSDK({
      githubToken: 'valid-token',
      githubRepo: 'owner/repo',
      isTestMode: true
    });
    expect(validSdk).toBeInstanceOf(GitHubRewardsSDK);
  });

  it('should require githubRepo in owner/repo format', () => {
    expect(() => {
      new GitHubRewardsSDK({
        githubToken: 'valid-token',
        githubRepo: 'invalid-format',
        isTestMode: true
      });
    }).toThrow(/githubRepo must be in format "owner\/repo"/);
  });

  it('should require non-empty githubToken', () => {
    expect(() => {
      new GitHubRewardsSDK({
        githubToken: '',
        githubRepo: 'owner/repo',
        isTestMode: true
      });
    }).toThrow(/githubToken is required/);
  });
});
