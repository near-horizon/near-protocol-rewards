import { NEARProtocolRewardsSDK } from '../../src/sdk';
import { createMockGitHubMetrics, createMockNEARMetrics } from '../helpers/mock-data';
import { testConfig } from '../setup';

jest.mock('../../src/collectors/github', () => ({
  GitHubCollector: jest.fn().mockImplementation(() => ({
    collectMetrics: jest.fn().mockResolvedValue(createMockGitHubMetrics)
  }))
}));

jest.mock('../../src/collectors/near', () => ({
  NEARCollector: jest.fn().mockImplementation(() => ({
    collectMetrics: jest.fn().mockResolvedValue(createMockNEARMetrics)
  }))
}));

describe('NEARProtocolRewardsSDK Integration', () => {
  let sdk: NEARProtocolRewardsSDK;

  beforeEach(() => {
    sdk = new NEARProtocolRewardsSDK(testConfig);
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
