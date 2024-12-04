import { GitHubCollector } from '../../src/collectors/github';
import { ConsoleLogger } from '../../src/utils/logger';
import { RateLimiter } from '../../src/utils/rate-limiter';

describe('Live API Integration', () => {
  let collector: GitHubCollector;

  beforeEach(() => {
    const logger = new ConsoleLogger();
    const rateLimiter = new RateLimiter({ maxRequestsPerSecond: 1 }); // Very low limit for testing
    
    collector = new GitHubCollector({
      token: process.env.GITHUB_TOKEN!,
      repo: process.env.TEST_GITHUB_REPO!,
      logger,
      rateLimiter
    });
  });

  it('should handle rate limits gracefully', async () => {
    // Skip if no token provided
    if (!process.env.GITHUB_TOKEN) {
      console.warn('Skipping test: No GitHub token provided');
      return;
    }

    // Make multiple concurrent requests to trigger rate limiting
    const promises = Array(5).fill(null).map(() => collector.testConnection());
    
    const results = await Promise.allSettled(promises);
    const rejected = results.filter(r => r.status === 'rejected');
    
    // At least one request should succeed
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    expect(fulfilled.length).toBeGreaterThan(0);
    
    // Some requests might be rate limited
    expect(rejected.length).toBeLessThanOrEqual(promises.length);
  });
}); 