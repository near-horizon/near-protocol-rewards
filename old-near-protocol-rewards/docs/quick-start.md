# Quick Start Guide

## Prerequisites

- A GitHub repository
- Node.js installed (download from [nodejs.org](https://nodejs.org))

## Setup (One Command!)

1. Open your terminal
2. Navigate to your repository
3. Run:

```bash
npx near-protocol-rewards init
```

That's it! 🎉

## What Happens Next?

1. **GitHub Action Created**
   - Automatic metrics collection is set up
   - No configuration needed
   - Uses GitHub's built-in security

2. **First Metrics Collection**
   - Push any change to main branch
   - Wait for GitHub Action to run (~2 minutes)
   - Check Actions tab for status

3. **View Your Metrics**
   - Go to [Protocol Rewards Dashboard](https://protocol-rewards-dashboard.vercel.app/)
   - Sign in with GitHub
   - Select your repository

## Commands

### Initialize Tracking

```bash
npx near-protocol-rewards init
```

Sets up automatic metrics collection through GitHub Actions.

### Check Current Rewards (v0.3.0+)

```bash
npx near-protocol-rewards calculate
```

Shows your current:

- Level and total score
- Detailed metric breakdown
- Achievements earned
- Validation warnings (if any)

#### 🔐 Running in GitHub Actions (Recommended)

The calculate command is automatically available in your GitHub Actions workflow where tokens are securely managed. No additional setup required!

#### Example Output

```bash
📊 Rewards Calculation Results:

🏆 Level: Gold (75.50/100)
💰 Weekly Reward: $1,500
💰 Monthly Projection: $6,000

Note: Coming in v0.4.0 - NEAR transaction tracking will increase reward potential! 🚀

Breakdown:
📝 Commits: 25.00
🔄 Pull Requests: 25.00
👀 Reviews: 20.00
🎯 Issues: 15.00

🌟 Achievements:
- Consistent Contributor: Maintained steady activity for 4+ weeks
- Team Player: Reviewed 10+ pull requests
```

#### 🖥️ Running Locally

To run calculations locally, you'll need:

1. A GitHub Personal Access Token with `repo` scope
2. Set environment variables manually

```bash
# ⚠️ Note: Local testing is optional. 
# The command runs automatically in GitHub Actions with secure tokens.

# If you still want to test locally:
export GITHUB_TOKEN="your_personal_access_token"
export GITHUB_REPO="owner/repo"
npx near-protocol-rewards calculate
```

> 💡 **Best Practice**: For security, we recommend using the GitHub Actions workflow instead of running locally. This ensures tokens are managed securely by GitHub.

## 🆕 Upgrading to v0.3.0+

### Breaking Changes

1. Configuration simplified:
   - `projectId` no longer required
   - `nearAccount` field removed
   - Only GitHub-related fields needed

### How to Upgrade

1. Update your package:

   ```bash
   npm install near-protocol-rewards@latest
   ```

2. Update your configuration:

   ```typescript
   // Old configuration
   const sdk = new GitHubRewardsSDK({
     projectId: 'your-project',        // Remove this
     nearAccount: 'your.near',         // Remove this
     githubToken: process.env.GITHUB_TOKEN,
     githubRepo: 'owner/repo',
     timeframe: 'week'
   });

   // New configuration
   const sdk = new GitHubRewardsSDK({
     githubToken: process.env.GITHUB_TOKEN,
     githubRepo: 'owner/repo',
     timeframe: 'week'
   });
   ```

## Common Questions

### When do metrics update?

- Every push to main branch
- Every 12 hours automatically
- Check Actions tab for latest runs

### Do I need to set up any tokens?

No! We use GitHub's built-in security.

### Not seeing your metrics?

1. Make sure you pushed to main
2. Check Actions tab for any errors
3. [See Troubleshooting Guide](troubleshooting.md)

## Need Help?

- [Troubleshooting Guide](troubleshooting.md)
- [Report Issues](https://github.com/jbarnes850/near-protocol-rewards/issues)
- [Dashboard Support](https://github.com/jbarnes850/protocol-rewards-dashboard/issues)
