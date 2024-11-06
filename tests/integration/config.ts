export const integrationConfig = {
  projectId: process.env.TEST_PROJECT_ID || 'test-project',
  nearAccount: process.env.TEST_NEAR_ACCOUNT || 'test.testnet',
  githubRepo: process.env.TEST_GITHUB_REPO || 'test-org/test-repo',
  githubToken: process.env.GITHUB_TOKEN,
  storage: {
    type: 'postgres' as const,
    config: {
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME || 'near_rewards_test',
      user: process.env.TEST_DB_USER || 'test_user',
      password: process.env.TEST_DB_PASSWORD || 'test_password'
    }
  }
}; 