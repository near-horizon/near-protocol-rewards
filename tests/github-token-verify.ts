import { Octokit } from '@octokit/rest';

async function verifyToken() {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  });

  try {
    // Test API access
    const { data } = await octokit.rest.users.getAuthenticated();
    console.log('✅ Token is valid');
    console.log('Authenticated as:', data.login);
    
    // Test repo access
    const [owner, repo] = process.env.GITHUB_REPO!.split('/');
    await octokit.rest.repos.get({
      owner,
      repo
    });
    console.log('✅ Repository access confirmed');
  } catch (error) {
    console.error('❌ Token verification failed:', error);
  }
}

verifyToken();
