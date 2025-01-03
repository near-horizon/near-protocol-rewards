import { GitHubRewardsSDK } from '../../src/sdk';
import type { ProcessedMetrics } from '../../src/types/metrics';

jest.mock('../../src/utils/logger', () => {
  return {
    ConsoleLogger: jest.fn().mockReturnValue({
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn()
    })
  };
});

// Import logger after mocking
import { ConsoleLogger } from '../../src/utils/logger';

// Import program after mocks
import { program } from '../../src/cli';

describe('calculate command', () => {
  const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  let logger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GITHUB_TOKEN = 'test-token';
    process.env.GITHUB_REPO = 'owner/repo';
    
    // Get the logger instance that CLI is using
    logger = new ConsoleLogger();
  });

  it('should display complete rewards calculation results for calendar month', async () => {
    // Mock a specific date for consistent testing
    const mockDate = new Date('2024-01-22T12:00:00Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

    const mockMetrics: ProcessedMetrics = {
      github: {
        commits: { 
          count: 50, 
          authors: [{ login: 'user1', count: 25 }],
          frequency: { daily: [5], weekly: 50, monthly: 200 }
        },
        pullRequests: { 
          open: 5,
          merged: 10, 
          closed: 2,
          authors: ['user1'] 
        },
        reviews: { count: 15, authors: ['user1'] },
        issues: { closed: 8, open: 2, participants: ['user1'] },
        metadata: {
          collectionTimestamp: mockDate.getTime(),
          source: 'github',
          projectId: 'test'
        }
      },
      validation: {
        warnings: [],
        isValid: true,
        errors: [],
        timestamp: mockDate.getTime(),
        metadata: {
          source: 'github',
          validationType: 'data'
        }
      },
      score: {
        total: 85,
        breakdown: {
          commits: 25,
          pullRequests: 25,
          reviews: 20,
          issues: 15
        }
      },
      timestamp: mockDate.getTime(),
      collectionTimestamp: mockDate.getTime(),
      periodStart: mockDate.getTime() - (7 * 24 * 60 * 60 * 1000),
      periodEnd: mockDate.getTime(),
      metadata: {
        source: 'github',
        projectId: 'test',
        collectionTimestamp: mockDate.getTime(),
        periodStart: mockDate.getTime() - (7 * 24 * 60 * 60 * 1000),
        periodEnd: mockDate.getTime(),
        timeframe: 'calendar-month'
      }
    };

    // Add calendar-month argument
    process.argv.push('--calendar-month');

    // Mock the SDK's methods
    jest.spyOn(GitHubRewardsSDK.prototype, 'getMetrics').mockResolvedValue(mockMetrics);
    jest.spyOn(GitHubRewardsSDK.prototype, 'startTracking').mockResolvedValue(undefined);
    jest.spyOn(GitHubRewardsSDK.prototype, 'stopTracking').mockResolvedValue(undefined);

    // Execute calculate command
    await program.parseAsync(['node', 'test', 'calculate']);

    // Verify calendar month specific output
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('📅 January 2024 (22 days complete)'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('⏳ Days Remaining: 9'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('💰 Month-to-Date: $'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('💰 Projected Monthly Total: $'));
    
    // Verify reward calculation components are present
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('🏆 Level:'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Breakdown:'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('📝 Commits:'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('🔄 Pull Requests:'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('👀 Reviews:'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('🎫 Issues:'));

    // Clean up
    process.argv.pop();
    jest.restoreAllMocks();
  });

  it('should handle different month lengths correctly', async () => {
    // Test February (28 days)
    const febDate = new Date('2024-02-15T12:00:00Z');
    jest.spyOn(global, 'Date').mockImplementation(() => febDate);
    
    // Use same mock metrics structure but update timestamps
    const mockMetrics: ProcessedMetrics = {
      github: {
        commits: {
          count: 50,
          authors: [{ login: 'user1', count: 25 }],
          frequency: { daily: [5], weekly: 50, monthly: 200 }
        },
        pullRequests: {
          open: 5,
          merged: 10,
          closed: 2,
          authors: ['user1']
        },
        reviews: {
          count: 15,
          authors: ['user1']
        },
        issues: {
          closed: 8,
          open: 2,
          participants: ['user1']
        },
        metadata: {
          collectionTimestamp: febDate.getTime(),
          source: 'github',
          projectId: 'test'
        }
      },
      validation: {
        warnings: [],
        isValid: true,
        errors: [],
        timestamp: febDate.getTime(),
        metadata: {
          source: 'github',
          validationType: 'data'
        }
      },
      score: {
        total: 85,
        breakdown: {
          commits: 25,
          pullRequests: 25,
          reviews: 20,
          issues: 15
        }
      },
      timestamp: febDate.getTime(),
      collectionTimestamp: febDate.getTime(),
      periodStart: febDate.getTime() - (7 * 24 * 60 * 60 * 1000),
      periodEnd: febDate.getTime(),
      metadata: {
        source: 'github',
        projectId: 'test',
        collectionTimestamp: febDate.getTime(),
        periodStart: febDate.getTime() - (7 * 24 * 60 * 60 * 1000),
        periodEnd: febDate.getTime(),
        timeframe: 'calendar-month'
      }
    };

    process.argv.push('--calendar-month');
    jest.spyOn(GitHubRewardsSDK.prototype, 'getMetrics').mockResolvedValue(mockMetrics);
    await program.parseAsync(['node', 'test', 'calculate']);

    // Verify February output
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('📅 February 2024 (15 days complete)'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('⏳ Days Remaining: 13')); // 28 - 15
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('💰 Month-to-Date: $'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('💰 Projected Monthly Total: $'));

    // Test April (30 days)
    const aprDate = new Date('2024-04-30T12:00:00Z'); // Last day of month
    jest.spyOn(global, 'Date').mockImplementation(() => aprDate);
    mockMetrics.timestamp = aprDate.getTime();
    await program.parseAsync(['node', 'test', 'calculate']);

    // Verify April output (last day)
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('📅 April 2024 (30 days complete)'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('⏳ Days Remaining: 0')); // Last day
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('💰 Month-to-Date: $'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('💰 Projected Monthly Total: $'));

    // Test December (31 days)
    const decDate = new Date('2024-12-01T12:00:00Z'); // First day of month
    jest.spyOn(global, 'Date').mockImplementation(() => decDate);
    mockMetrics.timestamp = decDate.getTime();
    await program.parseAsync(['node', 'test', 'calculate']);

    // Verify December output (first day)
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('📅 December 2024 (1 days complete)'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('⏳ Days Remaining: 30')); // 31 - 1
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('💰 Month-to-Date: $'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('💰 Projected Monthly Total: $'));

    // Clean up
    process.argv.pop();
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.resetModules();
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_REPO;
  });

  it('should display complete rewards calculation results for weekly timeframe', async () => {
    const mockMetrics: ProcessedMetrics = {
      github: {
        commits: { 
          count: 50, 
          authors: [{ login: 'user1', count: 25 }],
          frequency: { daily: [5], weekly: 50, monthly: 200 }
        },
        pullRequests: { 
          open: 5,
          merged: 10, 
          closed: 2,
          authors: ['user1'] 
        },
        reviews: { count: 15, authors: ['user1'] },
        issues: { closed: 8, open: 2, participants: ['user1'] },
        metadata: {
          collectionTimestamp: now,
          source: 'github',
          projectId: 'test'
        }
      },
      validation: {
        warnings: [],
        isValid: true,
        errors: [],
        timestamp: now,
        metadata: {
          source: 'github',
          validationType: 'data'
        }
      },
      score: {
        total: 85,
        breakdown: {
          commits: 25,
          pullRequests: 25,
          reviews: 20,
          issues: 15
        }
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
        timeframe: 'week'
      }
    };

    // Mock the SDK's getMetrics method
    jest.spyOn(GitHubRewardsSDK.prototype, 'getMetrics').mockResolvedValue(mockMetrics);
    jest.spyOn(GitHubRewardsSDK.prototype, 'startTracking').mockResolvedValue(undefined);
    jest.spyOn(GitHubRewardsSDK.prototype, 'stopTracking').mockResolvedValue(undefined);

    // Execute calculate command
    await program.parseAsync(['node', 'test', 'calculate']);

    // Verify logger calls match cli.ts exactly
    expect(logger.info).toHaveBeenCalledWith('\n📊 Rewards Calculation Results:\n');
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('🏆 Level:'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('💰 Weekly Reward: $'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('💰 Monthly Projection: $'));
    expect(logger.info).toHaveBeenCalledWith('\nNote: Coming in v0.4.0 - NEAR transaction tracking will increase reward potential! 🚀\n');
    expect(logger.info).toHaveBeenCalledWith('\nBreakdown:');
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('📝 Commits:'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('🔄 Pull Requests:'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('👀 Reviews:'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('🎯 Issues:'));
    
    expect(mockExit).toHaveBeenCalledWith(0);
  });
});
