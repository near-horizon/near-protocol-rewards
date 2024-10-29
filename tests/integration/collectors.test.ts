import { GitHubCollector } from '../../src/collectors/github';
import { NEARCollector } from '../../src/collectors/near';
import { Logger } from '../../src/utils/logger';
import axios, { AxiosInstance } from 'axios';
import { NEARMetrics } from '../../src/types';
import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Setup mock axios instance for NEAR API
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

    return Promise.reject(new Error(`Unknown endpoint: ${url}`));
  }),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn()
} as unknown as AxiosInstance;

mockedAxios.create.mockReturnValue(mockAxiosInstance);

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      repos: {
        listCommits: jest.fn().mockResolvedValue({
          data: Array(10).fill({
            sha: 'abc123',
            commit: {
              author: { name: 'user1', date: new Date().toISOString() },
              message: 'test commit'
            }
          })
        }),
      },
      pulls: {  // Changed from pullRequests to pulls to match Octokit API
        list: jest.fn().mockResolvedValue({
          data: Array(5).fill({
            number: 1,
            state: 'open',
            user: { login: 'user1' },
            created_at: new Date().toISOString(),
            merged_at: new Date().toISOString()
          })
        })
      },
      issues: {
        list: jest.fn().mockResolvedValue({
          data: Array(3).fill({
            number: 1,
            state: 'open',
            user: { login: 'user1' },
            created_at: new Date().toISOString(),
            closed_at: null
          })
        })
      }
    }
  }))
}));

describe('Collectors Integration', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger({ projectId: 'test' });

    // Verify required environment variables
    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) {
      throw new Error('Missing required GitHub environment variables');
    }

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should collect GitHub metrics', async () => {
    const collector = new GitHubCollector({
      repo: process.env.GITHUB_REPO!,
      token: process.env.GITHUB_TOKEN!,
      logger
    });

    const metrics = await collector.collectMetrics();
    
    expect(metrics).toBeDefined();
    expect(metrics.commits).toBeDefined();
    expect(metrics.commits.count).toBe(10);
    expect(metrics.commits.authors).toContain('user1');
    
    expect(metrics.pullRequests).toBeDefined();
    expect(metrics.pullRequests.open).toBe(5);
    expect(metrics.pullRequests.authors).toContain('user1');
    
    expect(metrics.issues).toBeDefined();
    expect(metrics.issues.open).toBe(3);
    expect(metrics.issues.participants).toContain('user1');
    
    expect(metrics.metadata).toBeDefined();
    expect(metrics.metadata.source).toBe('github');
    expect(metrics.metadata.projectId).toBe(process.env.GITHUB_REPO);
  });

  it('should collect NEAR metrics', async () => {
    const collector = new NEARCollector({
      account: process.env.NEAR_ACCOUNT!,
      logger,
      maxRequestsPerSecond: 1
    });

    const metrics = await collector.collectMetrics();
    
    expect(metrics).toBeDefined();
    expect(metrics.transactions).toBeDefined();
    expect(metrics.transactions.count).toBe(50);
    expect(metrics.transactions.volume).toBe('1000000000000000000000000'); // In yoctoNEAR
    expect(metrics.transactions.uniqueUsers).toHaveLength(2);
    
    expect(metrics.contract).toBeDefined();
    expect(metrics.contract.calls).toBe(50);
    expect(metrics.contract.uniqueCallers).toHaveLength(2);
    
    expect(metrics.metadata).toBeDefined();
    expect(metrics.metadata.source).toBe('near');
    expect(metrics.metadata.blockHeight).toBe(12345678);
    
    expect(metrics.metadata.priceData).toBeDefined();
    expect(metrics.metadata.priceData?.usd).toBe(1.45);
    expect(metrics.metadata.priceData?.timestamp).toBeDefined();
  });
});
