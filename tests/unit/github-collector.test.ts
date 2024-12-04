import { GitHubCollector } from '../../src/collectors/github';
import { ConsoleLogger } from '../../src/utils/logger';
import { Octokit } from '@octokit/rest';
import { GitHubMetrics } from '../../src/types/metrics';
import { GitHubCollectorConfig } from '../../src/types/collectors';
import { RateLimiter } from '../../src/utils/rate-limiter';

// Create a mock class that extends Octokit
class MockOctokit {
  public rest = {
    repos: {
      listCommits: jest.fn(),
      get: jest.fn()
    },
    pulls: {
      list: jest.fn(),
      listReviews: jest.fn()
    },
    issues: {
      listForRepo: jest.fn()
    },
    rateLimit: {
      get: jest.fn()
    }
  };
  public request = jest.fn();
  public paginate = jest.fn();
}

// Mock the Octokit module
jest.mock('@octokit/rest', () => {
  return {
    Octokit: jest.fn().mockImplementation(() => new MockOctokit())
  };
});

describe('GitHubCollector', () => {
  let collector: GitHubCollector;
  let mockOctokit: MockOctokit;
  const logger = new ConsoleLogger('error');

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create a new instance of mock Octokit
    mockOctokit = new MockOctokit();

    // Setup default mock implementations
    mockOctokit.rest.repos.get.mockResolvedValue({ status: 200 });
    mockOctokit.rest.rateLimit.get.mockResolvedValue({
      data: {
        resources: {
          core: {
            limit: 5000,
            remaining: 4999,
            reset: Date.now() / 1000 + 3600
          }
        }
      }
    });

    const config: GitHubCollectorConfig = {
      token: 'test-token',
      repo: 'test-org/test-repo',
      logger,
      rateLimiter: new RateLimiter({ maxRequestsPerSecond: 10 })
    };

    collector = new GitHubCollector(config);
    (collector as any).octokit = mockOctokit;
  });

  describe('Metrics Collection', () => {
    it('should collect all metrics types', async () => {
      // Mock commits
      mockOctokit.paginate.mockResolvedValueOnce([
        { 
          sha: 'abc', 
          commit: { 
            author: { 
              name: 'user1',
              date: new Date().toISOString()
            }
          },
          author: { login: 'user1' }
        },
        { 
          sha: 'def', 
          commit: { 
            author: { 
              name: 'user2',
              date: new Date().toISOString()
            }
          },
          author: { login: 'user2' }
        }
      ]);

      // Mock pull requests
      mockOctokit.paginate.mockResolvedValueOnce([
        { number: 1, state: 'open', user: { login: 'user1' } }
      ]).mockResolvedValueOnce([
        { 
          number: 2, 
          state: 'closed', 
          merged_at: new Date().toISOString(), 
          user: { login: 'user2' }
        }
      ]);

      // Mock reviews
      mockOctokit.paginate.mockResolvedValueOnce([
        { number: 2, state: 'closed', user: { login: 'user2' } }
      ]).mockResolvedValueOnce([
        { 
          id: 1,
          user: { login: 'user1' },
          state: 'APPROVED'
        }
      ]);

      // Mock issues
      mockOctokit.paginate.mockResolvedValueOnce([
        { number: 1, state: 'open', user: { login: 'user1' } }
      ]).mockResolvedValueOnce([
        { 
          number: 2, 
          state: 'closed', 
          user: { login: 'user2' },
          assignees: [{ login: 'user1' }]
        }
      ]);

      const metrics = await collector.collectMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.commits.count).toBeGreaterThan(0);
      expect(metrics.pullRequests.merged).toBeGreaterThan(0);
      expect(metrics.issues.closed).toBeGreaterThan(0);
    });
  });
}); 