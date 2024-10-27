import { NEARProtocolRewardsSDK } from '../../src/sdk';
import { createMockGitHubMetrics, createMockNEARMetrics } from '../helpers/mock-data';
import { testConfig } from '../setup';
import { MetricsAggregator } from '../../src/aggregator/metrics-aggregator';
import { GitHubMetrics, NEARMetrics } from '../../src/types';

jest.mock('../../src/collectors/github', () => ({
  GitHubCollector: jest.fn().mockImplementation(() => ({
    collectMetrics: jest.fn().mockResolvedValue(createMockGitHubMetrics())
  }))
}));

jest.mock('../../src/collectors/near', () => ({
  NEARCollector: jest.fn().mockImplementation(() => ({
    collectMetrics: jest.fn().mockResolvedValue(createMockNEARMetrics())
  }))
}));

describe('NEARProtocolRewardsSDK Integration', () => {
  let sdk: NEARProtocolRewardsSDK;

  beforeEach(() => {
    sdk = new NEARProtocolRewardsSDK(testConfig);
    
    // Mock metrics aggregator with correct function signature
    jest.spyOn(MetricsAggregator.prototype, 'aggregate')
      .mockImplementation((github: GitHubMetrics, near: NEARMetrics) => ({
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
  });
});
