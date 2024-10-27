import { Octokit } from '@octokit/rest';

async function verifyTokenPermissions() {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  });

  try {
    // Test authentication
    const { data: user } = await octokit.users.getAuthenticated();
    console.log('✅ Authenticated as:', user.login);

    // Test repo access
    const [owner, repo] = process.env.GITHUB_REPO!.split('/');
    const { data: repository } = await octokit.repos.get({
      owner,
      repo
    });
    console.log('✅ Repository access confirmed:', repository.full_name);

    // Test specific permissions
    const { data: commits } = await octokit.repos.listCommits({
      owner,
      repo,
      per_page: 1
    });
    console.log('✅ Commit access confirmed');

    const { data: issues } = await octokit.issues.list({
      owner,
      repo,
      per_page: 1
    });
    console.log('✅ Issues access confirmed');

  } catch (error) {
    console.error('❌ Token verification failed:', error);
    process.exit(1);
  }
}

verifyTokenPermissions();
