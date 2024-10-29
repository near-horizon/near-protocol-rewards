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

// Mock GitHub collector
jest.mock('../../src/collectors/github', () => ({
  GitHubCollector: jest.fn().mockImplementation(() => ({
    collectMetrics: jest.fn().mockResolvedValue({
      commits: {
        count: 10,
        frequency: 2.5,
        authors: ['user1', 'user2']
      },
      pullRequests: {
        open: 5,
        merged: 15,
        authors: ['user1', 'user2']
      },
      issues: {
        open: 3,
        closed: 12,
        participants: ['user1', 'user2', 'user3']
      },
      metadata: {
        collectionTimestamp: Date.now(),
        source: 'github',
        projectId: 'test-project',
        periodStart: Date.now() - (7 * 24 * 60 * 60 * 1000),
        periodEnd: Date.now()
      }
    })
  }))
}));

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
        if (url.includes('/account/')) {
          if (url.includes('/txns')) {
            return Promise.resolve({
              data: {
                txns: [
                  {
                    hash: 'hash1',
                    signer_account_id: 'user1.near',
                    amount: '500000000000000000000000'
                  },
                  {
                    hash: 'hash2',
                    signer_account_id: 'user2.near',
                    amount: '500000000000000000000000'
                  }
                ],
                total_amount: '1000000000000000000000000'
              }
            });
          }
          
          if (url.includes('/contract')) {
            return Promise.resolve({
              data: {
                contract: {
                  transactions_count: 50,
                  unique_callers_count: 2,
                  block_height: '12345678'
                }
              }
            });
          }
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

    // Add specific NEAR metrics assertions
    const nearMetrics = (metrics as any).near;
    expect(nearMetrics.transactions.count).toBe(50);
    expect(nearMetrics.transactions.volume).toBe('1000000000000000000000000');
    expect(nearMetrics.transactions.uniqueUsers).toHaveLength(2);
    expect(nearMetrics.contract.calls).toBe(50);
    expect(nearMetrics.metadata.blockHeight).toBe(12345678);
    expect(nearMetrics.metadata.priceData.usd).toBe(1.45);

    await sdk.stopTracking();
  }, 30000);
});
