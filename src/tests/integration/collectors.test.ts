import { GitHubCollector } from '../../collectors/github';
import { NEARCollector } from '../../collectors/near';
import { Logger } from '../../utils/logger';

describe('Collectors Integration Tests', () => {
  const logger = new Logger({ projectId: 'test' });

  describe('GitHubCollector', () => {
    const collector = new GitHubCollector({
      repo: process.env.TEST_GITHUB_REPO || 'test/repo',
      token: process.env.TEST_GITHUB_TOKEN || 'test-token',
      logger
    });

    it('should collect GitHub metrics', async () => {
      const metrics = await collector.collectMetrics();
      expect(metrics).toHaveProperty('commits');
      expect(metrics).toHaveProperty('pullRequests');
      expect(metrics).toHaveProperty('issues');
      expect(metrics.metadata.collectionTimestamp).toBeDefined();
    });
  });

  describe('NEARCollector', () => {
    const collector = new NEARCollector({
      account: process.env.TEST_NEAR_ACCOUNT || 'test.near',
      logger
    });

    it('should collect NEAR metrics', async () => {
      const metrics = await collector.collectMetrics();
      expect(metrics).toHaveProperty('transactions');
      expect(metrics).toHaveProperty('contract');
      expect(metrics.metadata.blockHeight).toBeDefined();
    });
  });
});
