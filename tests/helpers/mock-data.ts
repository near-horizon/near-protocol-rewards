import { GitHubMetrics, NEARMetrics } from '../../types';

export const createMockGitHubMetrics = (
  overrides: Partial<GitHubMetrics> = {}
): GitHubMetrics => ({
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
  transactions: {
    count: 100,
    volume: "1000",
    uniqueUsers: ['user1.near', 'user2.near']
  },
  contract: {
    calls: 50,
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
