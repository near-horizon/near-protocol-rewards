import { GitHubRewardsSDK } from '../../../src/sdk';
import type { ProcessedMetrics } from '../../../src/types/metrics';
import { ConsoleLogger } from '../../../src/utils/logger';
import { program } from '../../../src/cli';


jest.mock('../../../src/utils/logger', () => ({
  ConsoleLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  })
}));

describe('calculate command', () => {
  const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GITHUB_TOKEN = 'test-token';
    process.env.GITHUB_REPO = 'owner/repo';
  });

  afterEach(() => {
    jest.resetModules();
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_REPO;
  });

  it('should display complete rewards calculation results', async () => {
    const mockMetrics: ProcessedMetrics = {
      github: {
        commits: {
          count: 50,
          authors: [{ login: 'user1', count: 25 }],
          frequency: { daily: [5], weekly: 50, monthly: 200 },
        },
        pullRequests: {
          open: 5,
          merged: 10,
          closed: 2,
          authors: ['user1'],
        },
        reviews: { count: 15, authors: ['user1'] },
        issues: { closed: 8, open: 2, participants: ['user1'] },
        metadata: {
          collectionTimestamp: now,
          source: 'github',
          projectId: 'test',
        },
      },
      validation: {
        warnings: [],
        isValid: true,
        errors: [],
        timestamp: now,
        metadata: {
          source: 'github',
          validationType: 'data',
        },
      },
      score: {
        total: 85,
        breakdown: {
          commits: 25,
          pullRequests: 25,
          reviews: 20,
          issues: 15,
        },
      },
      timestamp: now,
      collectionTimestamp: now,
      periodStart: weekAgo,
      periodEnd: now,
      metadata: {
        source: 'github',
        projectId: 'test',
        collectionTimestamp: now,
        periodStart: weekAgo,
        periodEnd: now,
      },
    };

    jest.spyOn(GitHubRewardsSDK.prototype, 'getMetrics').mockResolvedValue(mockMetrics);
    jest.spyOn(GitHubRewardsSDK.prototype, 'startTracking').mockResolvedValue(undefined);
    jest.spyOn(GitHubRewardsSDK.prototype, 'stopTracking').mockResolvedValue(undefined);

    await program.parseAsync(['node', 'test', 'calculate']);

    let logger = new ConsoleLogger() as jest.Mocked<ConsoleLogger>;

    expect(logger.info).toHaveBeenCalledWith('\n📊 Rewards Calculation Results:\n');
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('🏆 Level:'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('💰 Weekly Reward: $'));
    expect(logger.info).toHaveBeenCalledWith('\nNote: Coming in v0.4.0 - NEAR transaction tracking will increase reward potential! 🚀\n');
    expect(logger.info).toHaveBeenCalledWith('\nBreakdown:');
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('📝 Commits:'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('🔄 Pull Requests:'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('👀 Reviews:'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('🎯 Issues:'));

    expect(mockExit).toHaveBeenCalledWith(0);
  });
});
