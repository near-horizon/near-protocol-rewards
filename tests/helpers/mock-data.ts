import { GitHubMetrics, NEARMetrics, StoredMetrics, ProcessedMetrics } from '../../src/types';

export const createMockGitHubMetrics = (
  overrides: Partial<GitHubMetrics> = {}
): GitHubMetrics => ({
  timestamp: Date.now(),
  projectId: 'test-project',
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
  },
  ...overrides
});

export const createMockNEARMetrics = (
  overrides: Partial<NEARMetrics> = {}
): NEARMetrics => ({
  timestamp: Date.now(),
  projectId: 'test-project',
  transactions: {
    count: 100,
    volume: "1000",
    uniqueUsers: ['user1.near', 'user2.near']
  },
  contract: {
    calls: 50,
    uniqueCallers: ['user1.near', 'user2.near']
  },
  contractCalls: {
    count: 50,
    uniqueCallers: ['user1.near', 'user2.near']
  },
  metadata: {
    collectionTimestamp: Date.now(),
    source: 'near',
    projectId: 'test-project',
    periodStart: Date.now() - (7 * 24 * 60 * 60 * 1000),
    periodEnd: Date.now(),
    priceData: {
      usd: 1.5,
      timestamp: Date.now()
    }
  },
  ...overrides
});

export const createMockStoredMetrics = (
  overrides: Partial<StoredMetrics> = {}
): StoredMetrics => {
  const timestamp = Date.now();
  const projectId = 'test-project';

  return {
    projectId,
    timestamp,
    github: createMockGitHubMetrics(),
    near: createMockNEARMetrics(),
    score: {
      total: 85,
      breakdown: { github: 80, near: 90 }
    },
    processed: {
      timestamp,
      collectionTimestamp: timestamp,
      source: 'github',
      projectId,
      periodStart: timestamp - 1000,
      periodEnd: timestamp,
      github: createMockGitHubMetrics(),
      near: createMockNEARMetrics(),
      score: {
        total: 85,
        breakdown: { github: 80, near: 90 }
      },
      validation: {
        isValid: true,
        errors: [],
        warnings: [],
        timestamp,
        metadata: {
          source: 'github',
          validationType: 'data'
        }
      }
    },
    signature: 'test-signature',
    ...overrides
  };
};
