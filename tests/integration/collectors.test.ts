import { GitHubCollector } from '../../src/collectors/github';
import { NEARCollector } from '../../src/collectors/near';
import { Logger } from '../../src/utils/logger';

describe('Collectors Integration', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger({ projectId: 'test' });
  });

  it('should collect GitHub metrics', async () => {
    const collector = new GitHubCollector({
      repo: process.env.GITHUB_REPO!,
      token: process.env.GITHUB_TOKEN!,
      logger,
      rateLimit: 1  // Changed to match interface
    });

    const metrics = await collector.collectMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.commits).toBeDefined();
    expect(metrics.pullRequests).toBeDefined();
  });

  it('should collect NEAR metrics', async () => {
    const collector = new NEARCollector({
      account: process.env.NEAR_ACCOUNT!,
      logger,
      rateLimit: 1  // Changed to match interface
    });

    const metrics = await collector.collectMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.transactions).toBeDefined();
    expect(metrics.contract).toBeDefined();
  });
});
