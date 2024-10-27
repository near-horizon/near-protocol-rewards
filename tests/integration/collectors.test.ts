import { GitHubCollector } from '../../src/collectors/github';
import { NEARCollector } from '../../src/collectors/near';
import { Logger } from '../../src/utils/logger';
import axios, { AxiosInstance } from 'axios';
import { NEARMetrics } from '../../src/types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Collectors Integration', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger({ projectId: 'test' });

    // Setup complete mock Axios instance with NEARBlocks API structure
    const mockAxiosInstance = {
      defaults: {},
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() }
      },
      getUri: jest.fn(),
      request: jest.fn(),
      get: jest.fn().mockImplementation((url: string) => {
        // Mock transaction endpoint response
        if (url.includes('/txns')) {
          return Promise.resolve({
            data: {
              txns: [
                {
                  transaction_hash: 'hash1',
                  signer_account_id: 'user1.near',
                  amount: '500'
                },
                {
                  transaction_hash: 'hash2',
                  signer_account_id: 'user2.near',
                  amount: '500'
                }
              ],
              total_txns: '2',
              total_amount: '1000'
            }
          });
        }
        // Mock contract endpoint response
        if (url.includes('/contract')) {
          return Promise.resolve({
            data: {
              contract: {
                transactions_count: '50',
                unique_callers_count: '2',
                block_height: '12345678',
                methods: [
                  { name: 'method1', count: '25' },
                  { name: 'method2', count: '25' }
                ]
              }
            }
          });
        }
        // Mock price endpoint response
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
      delete: jest.fn(),
      head: jest.fn(),
      options: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      postForm: jest.fn(),
      putForm: jest.fn(),
      patchForm: jest.fn()
    } as unknown as AxiosInstance;

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
  });

  it('should collect GitHub metrics', async () => {
    const collector = new GitHubCollector({
      repo: process.env.GITHUB_REPO!,
      token: process.env.GITHUB_TOKEN!,
      logger,
      maxRequestsPerSecond: 1
    });

    const metrics = await collector.collectMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.commits).toBeDefined();
    expect(metrics.pullRequests).toBeDefined();
  });

  it('should collect NEAR metrics', async () => {
    const collector = new NEARCollector({
      account: process.env.NEAR_ACCOUNT!,
      logger,
      maxRequestsPerSecond: 1
    });

    const metrics = await collector.collectMetrics();
    
    // Type assertion to help with optional fields
    const nearMetrics = metrics as Required<NEARMetrics>;
    
    // Verify metrics structure matches NEARMetrics interface
    expect(nearMetrics).toBeDefined();
    expect(nearMetrics.transactions).toBeDefined();
    expect(nearMetrics.transactions.count).toBe(50);
    expect(nearMetrics.transactions.volume).toBe('1000');
    expect(nearMetrics.transactions.uniqueUsers).toHaveLength(2);
    
    expect(nearMetrics.contract).toBeDefined();
    expect(nearMetrics.contract.calls).toBe(50);
    expect(nearMetrics.contract.uniqueCallers).toHaveLength(2);
    
    expect(nearMetrics.contractCalls).toBeDefined();
    expect(nearMetrics.contractCalls.count).toBe(50);
    expect(nearMetrics.contractCalls.uniqueCallers).toHaveLength(2);
    
    expect(nearMetrics.metadata).toBeDefined();
    expect(nearMetrics.metadata.source).toBe('near');
    expect(nearMetrics.metadata.blockHeight).toBe(12345678);
    
    // Safe assertions for optional priceData
    if (nearMetrics.metadata.priceData) {
      expect(nearMetrics.metadata.priceData.usd).toBe(1.45);
      expect(nearMetrics.metadata.priceData.timestamp).toBeDefined();
    } else {
      fail('Expected priceData to be defined');
    }
  }, 10000); // 10 second timeout
});
