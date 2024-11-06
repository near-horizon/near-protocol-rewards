import { NEARProtocolRewardsSDK } from '../../src/sdk';
import { createMockGitHubMetrics, createMockNEARMetrics } from '../helpers/mock-data';
import { testConfig } from '../setup';
import { MetricsAggregator } from '../../src/aggregator/metrics-aggregator';
import { GitHubMetrics, NEARMetrics, RewardCalculation } from '../../src/types/metrics';

// Mock PostgresStorage
jest.mock('../../src/storage/postgres', () => ({
  PostgresStorage: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    saveMetrics: jest.fn().mockResolvedValue(undefined),
    getLatestMetrics: jest.fn().mockResolvedValue(null),
    cleanup: jest.fn().mockResolvedValue(undefined)
  }))
}));

// Mock GitHub collector
jest.mock('../../src/collectors/github', () => ({
  GitHubCollector: jest.fn().mockImplementation(() => ({
    collectMetrics: jest.fn().mockResolvedValue(createMockGitHubMetrics())
  }))
}));

// Mock NEAR collector with consistent data structure
jest.mock('../../src/collectors/near', () => ({
  NEARCollector: jest.fn().mockImplementation(() => ({
    collectMetrics: jest.fn().mockResolvedValue(createMockNEARMetrics())
  }))
}));

describe('NEARProtocolRewardsSDK Integration', () => {
  let sdk: NEARProtocolRewardsSDK;

  beforeEach(() => {
    sdk = new NEARProtocolRewardsSDK(testConfig);
    
    // Mock metrics aggregator
    jest.spyOn(MetricsAggregator.prototype, 'aggregate')
      .mockImplementation(() => ({
        total: 85,
        breakdown: { github: 80, near: 90 }
      }));
  });

  afterEach(async () => {
    await sdk.cleanup();
  });

  test('should collect and process metrics', async () => {
    const metricsPromise = new Promise(resolve => {
      sdk.once('metrics:collected', resolve);
    });

    await sdk.startTracking();
    const metrics = await metricsPromise;

    expect(metrics).toBeDefined();
    expect(metrics).toHaveProperty('github');
    expect(metrics).toHaveProperty('near');
    expect(metrics).toHaveProperty('score');

    // Add specific assertions for NEAR metrics
    const nearMetrics = (metrics as any).near;
    expect(nearMetrics.transactions.count).toBe(50);
    expect(nearMetrics.transactions.volume).toBe('1000000000000000000000000');
    expect(nearMetrics.transactions.uniqueUsers).toHaveLength(2);
    expect(nearMetrics.contract.calls).toBe(50);
    expect(nearMetrics.metadata.blockHeight).toBe(12345678);
    expect(nearMetrics.metadata.priceData.usd).toBe(1.45);

    await sdk.stopTracking();
  }, 60000); // Increased timeout to match .env.test

  test('should calculate and emit rewards', async () => {
    const rewardPromise = new Promise(resolve => {
      sdk.once('reward:calculated', resolve);
    });

    await sdk.startTracking();
    const reward = await rewardPromise;

    expect(reward).toHaveProperty('score');
    expect(reward).toHaveProperty('rewards.usdAmount');
    expect(reward).toHaveProperty('rewards.nearAmount');
    expect(reward).toHaveProperty('rewards.signature');

    await sdk.stopTracking();
  });

  test('should handle reward calculation and storage', async () => {
    const rewardPromise = new Promise(resolve => {
      sdk.once('reward:calculated', resolve);
    });

    await sdk.startTracking();
    const reward = await rewardPromise as RewardCalculation;

    expect(reward.score.total).toBeGreaterThanOrEqual(0);
    expect(reward.score.total).toBeLessThanOrEqual(100);
    expect(reward.rewards.usdAmount).toBeGreaterThanOrEqual(250);
    expect(reward.rewards.usdAmount).toBeLessThanOrEqual(10000);
    expect(reward.rewards.signature).toBeDefined();

    await sdk.stopTracking();
  });
});

describe('SDK Package Integration', () => {
  test('should export all required components', () => {
    const sdk = require('../src/index');
    expect(sdk.NEARProtocolRewardsSDK).toBeDefined();
    expect(sdk.BaseError).toBeDefined();
    expect(sdk.ErrorCode).toBeDefined();
  });

  test('should initialize with minimal config', () => {
    const { NEARProtocolRewardsSDK } = require('../src/index');
    expect(() => new NEARProtocolRewardsSDK({
      projectId: 'test',
      nearAccount: 'test.near',
      githubRepo: 'test/repo',
      githubToken: 'ghp_token'
    })).not.toThrow();
  });
});
