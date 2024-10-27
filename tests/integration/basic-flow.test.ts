import { NEARProtocolRewardsSDK } from '../../src/sdk';
import { testConfig } from '../setup';

describe('Basic Integration Flow', () => {
  let sdk: NEARProtocolRewardsSDK;

  beforeEach(() => {
    sdk = new NEARProtocolRewardsSDK(testConfig);
  });

  afterEach(async () => {
    await sdk.cleanup();
  });

  test('complete metrics collection flow', async () => {
    // 1. Start tracking
    await sdk.startTracking();
    
    // 2. Wait for first metrics collection
    const metrics = await new Promise(resolve => {
      sdk.once('metrics:collected', resolve);
    });

    // 3. Verify metrics structure
    expect(metrics).toHaveProperty('github');
    expect(metrics).toHaveProperty('near');
    expect(metrics).toHaveProperty('score');

    // 4. Stop tracking
    await sdk.stopTracking();
  }, 30000); // 30 second timeout
});
