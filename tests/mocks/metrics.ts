export const mockGitHubMetrics = {
  commits: {
    count: 50,
    frequency: 7.2,
    authors: ['user1', 'user2']
  },
  pullRequests: {
    open: 5,
    merged: 15,
    authors: ['user1', 'user2']
  },
  issues: {
    open: 10,
    closed: 20,
    participants: ['user1', 'user2', 'user3']
  },
  metadata: {
    collectionTimestamp: Date.now(),
    source: 'github' as const,
    projectId: 'test-project',
    periodStart: Date.now() - (30 * 24 * 60 * 60 * 1000),
    periodEnd: Date.now()
  }
};

export const mockNEARMetrics = {
  transactions: {
    count: 1000,
    volume: "5000",
    uniqueUsers: ['account1.near', 'account2.near']
  },
  contract: {
    calls: 500,
    uniqueCallers: ['account1.near', 'account2.near']
  },
  metadata: {
    collectionTimestamp: Date.now(),
    source: 'near' as const,
    projectId: 'test-project',
    periodStart: Date.now() - (30 * 24 * 60 * 60 * 1000),
    periodEnd: Date.now()
  }
};
