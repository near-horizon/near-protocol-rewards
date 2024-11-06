import { NEARProtocolRewardsSDK } from '../../src';
import { integrationConfig } from './config';
import { ProcessedMetrics } from '../../src/types/metrics';

describe('Live API Integration Tests', () => {
  let sdk: NEARProtocolRewardsSDK;
  
  beforeAll(() => {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN is required for integration tests');
    }
    sdk = new NEARProtocolRewardsSDK({
      ...integrationConfig,
      githubToken: process.env.GITHUB_TOKEN
    });
  });

  afterAll(async () => {
    await sdk.cleanup();
  });

  test('should collect GitHub metrics', async () => {
    const metricsPromise = new Promise<ProcessedMetrics>(resolve => {
      sdk.once('metrics:collected', resolve);
    });

    await sdk.startTracking();
    const metrics = await metricsPromise;
    
    expect(metrics).toBeDefined();
    expect(metrics.github).toBeDefined();
    expect(metrics.github.commits).toBeDefined();
    
    await sdk.stopTracking();
  }, 30000);

  test('should collect NEAR metrics', async () => {
    const metricsPromise = new Promise<ProcessedMetrics>(resolve => {
      sdk.once('metrics:collected', resolve);
    });

    await sdk.startTracking();
    const metrics = await metricsPromise;
    
    expect(metrics).toBeDefined();
    expect(metrics.near).toBeDefined();
    expect(metrics.near.transactions).toBeDefined();
    
    await sdk.stopTracking();
  }, 30000);
}); 