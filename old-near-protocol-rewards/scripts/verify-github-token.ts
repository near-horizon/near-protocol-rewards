import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load test environment
const envPath = resolve(process.cwd(), '.env.test');
const result = dotenv.config({ path: envPath });
  
if (result.error) {
  console.error('❌ Error loading .env.test file:', result.error);
  process.exit(1);
}

async function verifyToken() {
  // Verify environment variables
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    console.error('❌ Missing required environment variables:');
    if (!token) console.error('- GITHUB_TOKEN');
    if (!repo) console.error('- GITHUB_REPO');
    process.exit(1);
  }

  // Verify token format
  if (!token.startsWith('ghp_')) {
    console.error('❌ Invalid token format. Token should start with "ghp_"');
    process.exit(1);
  }

  const octokit = new Octokit({
    auth: token,
    baseUrl: 'https://api.github.com',
    log: {
      debug: () => {},
      info: () => {},
      warn: console.warn,
      error: console.error
    }
  });

  try {
    console.log('🔍 Verifying GitHub token...');
    
    // Test authentication
    const { data: user } = await octokit.users.getAuthenticated();
    console.log('✅ Authentication successful');
    console.log('👤 Authenticated as:', user.login);

    // Test repository access
    const [owner, repoName] = repo.split('/');
    const { data: repository } = await octokit.repos.get({
      owner,
      repo: repoName
    });
    console.log('✅ Repository access confirmed:', repository.full_name);

    // Check rate limits
    const { data: rateLimit } = await octokit.rateLimit.get();
    console.log('\nℹ️  Rate Limits:');
    console.log(`- Core: ${rateLimit.resources.core.remaining}/${rateLimit.resources.core.limit}`);
    console.log(`- Search: ${rateLimit.resources.search.remaining}/${rateLimit.resources.search.limit}`);

  } catch (error: any) {
    console.error('\n❌ Verification failed:');
    if (error.status === 401) {
      console.error('Invalid token or token expired');
      console.error('Please generate a new token at: https://github.com/settings/tokens');
    } else if (error.status === 403) {
      console.error('Token lacks required permissions');
      console.error('Required permissions:');
      console.error('- repo (for private repos)');
      console.error('- public_repo (for public repos)');
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

verifyToken().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
