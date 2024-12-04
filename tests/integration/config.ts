export const integrationConfig = {
  githubRepo: process.env.TEST_GITHUB_REPO || 'test-org/test-repo',
  githubToken: process.env.GITHUB_TOKEN,
  timeframe: 'week' as const,
  weights: {
    commits: 0.35,
    pullRequests: 0.25,
    reviews: 0.20,
    issues: 0.20
  },
  validation: {
    github: {
      minCommits: 1,
      maxCommitsPerDay: 15,
      minAuthors: 1,
      suspiciousAuthorRatio: 0.8
    }
  }
};

export const shouldSkipIntegrationTests = !process.env.GITHUB_TOKEN;

if (shouldSkipIntegrationTests) {
  console.warn('Skipping integration tests: GITHUB_TOKEN not provided');
} 