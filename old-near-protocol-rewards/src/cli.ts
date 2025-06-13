#!/usr/bin/env node
import { Command } from 'commander';
import { GitHubRewardsSDK } from './sdk';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { GitHubRewardsCalculator, DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS } from './calculator/github-rewards';
import { ConsoleLogger } from './utils/logger';
import { GitHubValidator } from './validators/github';
import { BaseError } from './types/errors';

// Create a logger instance for consistent logging
const logger = new ConsoleLogger();

export const program = new Command();

program
  .name('near-protocol-rewards')
  .description('CLI for NEAR Protocol Rewards SDK')
  .version('0.3.3');

program
  .command('init')
  .description('Initialize NEAR Protocol Rewards in your project')
  .action(async () => {
    try {
      // 1. Create GitHub workflow directory
      const workflowDir = join(process.cwd(), '.github', 'workflows');
      mkdirSync(workflowDir, { recursive: true });

      // 2. Create workflow file
      const workflowContent = `name: NEAR Protocol Rewards Tracking
on:
  schedule:
    - cron: '0 0 * * *'     # Every 24 hours at midnight
  workflow_dispatch:        # Manual trigger
  push:
    branches: [ main ]     # Start on main branch updates

jobs:
  calculate-rewards:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: read
      pull-requests: read
      id-token: write
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Calculate Rewards
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          GITHUB_REPO: \${{ github.repository }}
        run: |
          npm install -g near-protocol-rewards@latest
          near-protocol-rewards calculate
`;

      writeFileSync(join(workflowDir, 'near-rewards.yml'), workflowContent);
      logger.info('✅ Created GitHub Action workflow');
      
      logger.info('\n🎉 NEAR Protocol Rewards initialized successfully!');
      logger.info('\nMetrics collection will start automatically:');
      logger.info('1. On every push to main branch');
      logger.info('2. Every 24 hours via scheduled run');
      logger.info('\n📊 View your metrics data on the dashboard: https://www.nearprotocolrewards.com/dashboard\n');
    } catch (error) {
      logger.error('Failed to initialize:', { 
        message: error instanceof Error ? error.message : String(error)
      });
      process.exit(1);
    }
  });

program
  .command('calculate')
  .description('Calculate rewards based on current metrics')
  .action(async () => {
    try {
      if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) {
        logger.error(`
❌ Missing required environment variables for local execution

This command requires:
- GITHUB_TOKEN: GitHub access token
- GITHUB_REPO: Repository in format "owner/repo"

These are automatically set in GitHub Actions environment.
If running locally, please set these variables first.
`);
        throw new Error('Required environment variables not found');
      }

      const sdk = new GitHubRewardsSDK({
        githubToken: process.env.GITHUB_TOKEN,
        githubRepo: process.env.GITHUB_REPO,
        timeframe: 'week'
      });

      // Initialize calculator with default settings
      const calculator = new GitHubRewardsCalculator(
        DEFAULT_WEIGHTS,
        DEFAULT_THRESHOLDS,
        logger,
        new GitHubValidator({
          minCommits: 10,
          maxCommitsPerDay: 15,
          minAuthors: 1,
          minReviewPrRatio: 0.5
        })
      );

      // Collect metrics
      await sdk.startTracking();
      const metrics = await sdk.getMetrics();
      await sdk.stopTracking();

      if (!metrics) {
        throw new Error('Failed to collect metrics');
      }

      // Check for validation warnings
      if (metrics.validation.warnings.length > 0) {
        logger.info('\n⚠️ Validation Warnings:');
        metrics.validation.warnings.forEach(warning => {
          logger.info(`- ${warning.message}${warning.context ? ` (${JSON.stringify(warning.context)})` : ''}`);
        });
        logger.info('\nThese warnings won\'t affect your rewards calculation, but addressing them may improve your score.\n');
      }

      // Calculate rewards
      const rewardsTotalMonth = calculator.calculateRewards(metrics.github, 'current-month');

      // Calculate monetary reward
      const calculateMonetaryReward = (score: number): number => {
        if (score >= 90) return 10000;     // Diamond:  $10,000
        if (score >= 80) return 8000;      // Platinum: $8,000
        if (score >= 70) return 6000;      // Gold:     $6,000
        if (score >= 60) return 4000;      // Silver:   $4,000
        if (score >= 50) return 2000;      // Bronze:   $2,000
        return 0;                          // Member:   $0
      };

      // Display results
      logger.info('\n📊 Rewards Calculation Results:\n');
      const monthReward = calculateMonetaryReward(rewardsTotalMonth.score.total);

      logger.info(`🏆 Level Offchain: ${rewardsTotalMonth.level.name} (${rewardsTotalMonth.score.total.toFixed(2)}/100)`);
      logger.info(`💰 Monthly Offchain Total Reward: $${monthReward.toLocaleString()}`);
      logger.info('\nBreakdown:');
      logger.info(`📝 Commits: ${rewardsTotalMonth.score.breakdown.commits.toFixed(2)}`);
      logger.info(`🔄 Pull Requests: ${rewardsTotalMonth.score.breakdown.pullRequests.toFixed(2)}`);
      logger.info(`👀 Reviews: ${rewardsTotalMonth.score.breakdown.reviews.toFixed(2)}`);
      logger.info(`🎯 Issues: ${rewardsTotalMonth.score.breakdown.issues.toFixed(2)}\n`);
      logger.info('\n📊 View your performance data on the dashboard: https://www.nearprotocolrewards.com/dashboard\n');

      if (rewardsTotalMonth.achievements.length > 0) {
        logger.info('🌟 Achievements:');
        rewardsTotalMonth.achievements.forEach(achievement => {
          logger.info(`- ${achievement.name}: ${achievement.description}`);
        });
      }

      process.exit(0);
    } catch (error) {
      if (error instanceof BaseError) {
        logger.error('Failed to calculate rewards:', { 
          message: error.message, 
          details: error.details 
        });
      } else if (error instanceof Error) {
        logger.error('Failed to calculate rewards:', { 
          message: error.message 
        });
      } else {
        logger.error('Failed to calculate rewards:', { 
          message: String(error) 
        });
      }
      process.exit(1);
    }
  });

if (require.main === module) {
  program.parse();
}   