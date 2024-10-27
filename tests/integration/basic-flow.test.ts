import { NEARProtocolRewardsSDK } from '../../src/sdk';
import { testConfig } from '../setup';
import axios, { AxiosInstance } from 'axios';
import type { Mocked } from 'jest-mock';
import { PostgresStorage } from '../../src/storage/postgres';

// Mock PostgresStorage
jest.mock('../../src/storage/postgres', () => ({
  PostgresStorage: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    saveMetrics: jest.fn().mockResolvedValue(undefined),
    cleanup: jest.fn().mockResolvedValue(undefined)
  }))
}));

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Basic Integration Flow', () => {
  let sdk: NEARProtocolRewardsSDK;

  beforeEach(() => {
    // Mock axios for NEAR API
    const mockAxiosInstance = {
      defaults: {},
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() }
      },
      get: jest.fn().mockImplementation((url: string) => {
        if (url.includes('/txns')) {
          return Promise.resolve({
            data: {
              txns: [{ signer_account_id: 'test.near' }],
              total_amount: '1000'
            }
          });
        }
        if (url.includes('/contract')) {
          return Promise.resolve({
            data: {
              contract: {
                transactions_count: '50',
                unique_callers_count: '2'
              }
            }
          });
        }
        if (url.includes('/stats/price')) {
          return Promise.resolve({
            data: {
              near: {
                usd: 1.45,
                timestamp: Date.now()
              }
            }
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      }),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn()
    } as unknown as AxiosInstance;

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    sdk = new NEARProtocolRewardsSDK(testConfig);
  });

  afterEach(async () => {
    await sdk.cleanup();
  });

  test('complete metrics collection flow', async () => {
    const metricsPromise = new Promise(resolve => {
      sdk.once('metrics:collected', resolve);
    });

    await sdk.startTracking();
    const metrics = await metricsPromise;

    expect(metrics).toBeDefined();
    expect(metrics).toHaveProperty('github');
    expect(metrics).toHaveProperty('near');

    await sdk.stopTracking();
  }, 30000);
});
