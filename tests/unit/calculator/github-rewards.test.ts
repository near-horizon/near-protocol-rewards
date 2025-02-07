import { GitHubRewardsSDK } from '../../../src/sdk';
import type { ProcessedMetrics, GitHubMetrics } from '../../../src/types/metrics';
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

    const logger = new ConsoleLogger() as jest.Mocked<ConsoleLogger>;

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

  it('should calculate previous month reward as 2500 and current month reward as 0', () => {
    const { GitHubRewardsCalculator, DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS } = require('../../../src/calculator/github-rewards');
    const { GitHubValidator } = require('../../../src/validators/github');

    const mockedLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    };

    const validator = new GitHubValidator({
      minCommits: 10,
      maxCommitsPerDay: 15,
      minAuthors: 1,
      minReviewPrRatio: 0.5,
    });

    const calculator = new GitHubRewardsCalculator(DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS, mockedLogger, validator);

    const previousMonthMetrics: GitHubMetrics = {
      commits: {
        count: DEFAULT_THRESHOLDS.commits,
        authors: [{ login: 'user1', count: DEFAULT_THRESHOLDS.commits }],
        frequency: { daily: [DEFAULT_THRESHOLDS.commits], weekly: DEFAULT_THRESHOLDS.commits, monthly: DEFAULT_THRESHOLDS.commits },
      },
      pullRequests: {
        open: 0,
        merged: DEFAULT_THRESHOLDS.pullRequests,
        closed: 0,
        authors: ['user1'],
      },
      reviews: {
        count: DEFAULT_THRESHOLDS.reviews,
        authors: ['user1'],
      },
      issues: {
        closed: DEFAULT_THRESHOLDS.issues,
        open: 0,
        participants: ['user1'],
      },
      metadata: {
        collectionTimestamp: now - 35 * 24 * 60 * 60 * 1000,
        source: 'github',
        projectId: 'test',
      },
    };

    const currentMonthMetrics: GitHubMetrics = {
      commits: {
        count: 0,
        authors: [],
        frequency: { daily: [0], weekly: 0, monthly: 0 },
      },
      pullRequests: {
        open: 0,
        merged: 0,
        closed: 0,
        authors: [],
      },
      reviews: {
        count: 0,
        authors: [],
      },
      issues: {
        closed: 0,
        open: 0,
        participants: [],
      },
      metadata: {
        collectionTimestamp: now,
        source: 'github',
        projectId: 'test',
      },
    };

    const previousMonthCalculation = calculator.calculateRewards(previousMonthMetrics, 'last-thirty-days');
    const currentMonthCalculation = calculator.calculateRewards(currentMonthMetrics, 'current-month');

    const calculateMonetaryReward = (score: number): number => {
      if (score >= 90) return 2500;
      if (score >= 80) return 2000;
      if (score >= 70) return 1500;
      if (score >= 60) return 1000;
      return score === 0 ? 0 : 500;
    };

    const previousMonthReward = calculateMonetaryReward(previousMonthCalculation.score.total);
    const currentMonthReward = calculateMonetaryReward(currentMonthCalculation.score.total);

    expect(previousMonthCalculation.score.total).toBe(100);
    expect(previousMonthCalculation.level.name).toBe('Diamond');
    expect(previousMonthReward).toBe(2500);

    expect(currentMonthCalculation.score.total).toBe(0);
    expect(currentMonthCalculation.level.name).toBe('Member');
    expect(currentMonthReward).toBe(0);
  });

  it('should calculate previous month as 0 reward and current month as intermediate reward', () => {
    const { GitHubRewardsCalculator, DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS } = require('../../../src/calculator/github-rewards');
    const { GitHubValidator } = require('../../../src/validators/github');

    const mockedLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    };

    const validator = new GitHubValidator({
      minCommits: 10,
      maxCommitsPerDay: 15,
      minAuthors: 1,
      minReviewPrRatio: 0.5,
    });

    const calculator = new GitHubRewardsCalculator(DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS, mockedLogger, validator);

    const previousMonthMetrics: GitHubMetrics = {
      commits: {
        count: 0,
        authors: [],
        frequency: { daily: [0], weekly: 0, monthly: 0 },
      },
      pullRequests: {
        open: 0,
        merged: 0,
        closed: 0,
        authors: [],
      },
      reviews: {
        count: 0,
        authors: [],
      },
      issues: {
        closed: 0,
        open: 0,
        participants: [],
      },
      metadata: {
        collectionTimestamp: now - 35 * 24 * 60 * 60 * 1000,
        source: 'github',
        projectId: 'test',
      },
    };

    const currentMonthMetrics: GitHubMetrics = {
      commits: {
        count: 50,
        authors: [{ login: 'user1', count: 50 }],
        frequency: { daily: [5], weekly: 50, monthly: 50 },
      },
      pullRequests: {
        open: 0,
        merged: 10,
        closed: 0,
        authors: ['user1'],
      },
      reviews: {
        count: 15,
        authors: ['user1'],
      },
      issues: {
        closed: 15,
        open: 0,
        participants: ['user1'],
      },
      metadata: {
        collectionTimestamp: now,
        source: 'github',
        projectId: 'test',
      },
    };

    const previousMonthCalculation = calculator.calculateRewards(previousMonthMetrics, 'last-thirty-days');
    const currentMonthCalculation = calculator.calculateRewards(currentMonthMetrics, 'current-month');

    const calculateMonetaryReward = (score: number): number => {
      if (score >= 90) return 2500;
      if (score >= 80) return 2000;
      if (score >= 70) return 1500;
      if (score >= 60) return 1000;
      return score === 0 ? 0 : 500;
    };

    const previousMonthReward = calculateMonetaryReward(previousMonthCalculation.score.total);
    const currentMonthReward = calculateMonetaryReward(currentMonthCalculation.score.total);

    expect(previousMonthCalculation.score.total).toBe(0);
    expect(previousMonthCalculation.level.name).toBe('Member');
    expect(previousMonthReward).toBe(0);

    expect(currentMonthCalculation.score.total).toBe(50);
    expect(currentMonthCalculation.level.name).toBe('Bronze');
    expect(currentMonthReward).toBe(500);
  });
});
