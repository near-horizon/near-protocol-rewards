#!/usr/bin/env node

import { Command } from 'commander';
import { GitHubRewardsSDK } from './sdk';
import { writeFileSync, mkdirSync } from 'fs';
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
  .version('0.3.1');

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
    - cron: '0 */12 * * *'  # Every 12 hours
  workflow_dispatch:        # Manual trigger
  push:
    branches: [ main ]     # Start on main branch updates

jobs:
  track-metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Run Metrics Collection
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          GITHUB_REPO: \${{ github.repository }}
        run: npx near-protocol-rewards track
`;

      writeFileSync(join(workflowDir, 'near-rewards.yml'), workflowContent);
      logger.info('✅ Created GitHub Action workflow');
      
      logger.info('\n🎉 NEAR Protocol Rewards initialized successfully!');
      logger.info('\nMetrics collection will start automatically:');
      logger.info('1. On every push to main branch');
      logger.info('2. Every 12 hours via scheduled run');
      logger.info('\n📊 View your metrics at: https://protocol-rewards-dashboard.vercel.app');
      logger.info('\nTo connect your repository to the dashboard:');
      logger.info('1. Go to https://protocol-rewards-dashboard.vercel.app');
      logger.info('2. Sign in with your GitHub account');
      logger.info('3. Select this repository from the list');
      logger.info('\nNote: First metrics will appear after your next push to main');
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
      // Environment variable validation
      if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) {
        logger.error(`
❌ Missing required environment variables

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
        if (metrics?.validation?.warnings?.length > 0) {
          logger.info('\n⚠️ Validation Warnings:');
          metrics.validation.warnings.forEach(warning => {
            logger.info(`- ${warning}`);
          });
          logger.info('\nThese warnings won\'t affect your rewards calculation, but addressing them may improve your score.\n');
        }

      // Calculate rewards
      const rewards = calculator.calculateRewards(metrics.github, 'week');

      // Calculate monetary reward (weekly basis)
      const calculateMonetaryReward = (score: number): number => {
        if (score >= 90) return 2500;      // Diamond:  $2,500/week
        if (score >= 80) return 2000;      // Platinum: $2,000/week
        if (score >= 70) return 1500;      // Gold:     $1,500/week
        if (score >= 60) return 1000;      // Silver:   $1,000/week
        return 500;                        // Bronze:   $500/week
      };

      // Display results
      logger.info('\n📊 Rewards Calculation Results:\n');
      const weeklyReward = calculateMonetaryReward(rewards.score.total);
      logger.info(`🏆 Level: ${rewards.level.name} (${rewards.score.total.toFixed(2)}/100)`);
      logger.info(`💰 Weekly Reward: $${weeklyReward.toLocaleString()}`);
      logger.info(`💰 Monthly Projection: $${(weeklyReward * 4).toLocaleString()}`);
      logger.info('\nNote: Coming in v0.4.0 - NEAR transaction tracking will increase reward potential! 🚀\n');
      logger.info('\nBreakdown:');
      logger.info(`📝 Commits: ${rewards.score.breakdown.commits.toFixed(2)}`);
      logger.info(`🔄 Pull Requests: ${rewards.score.breakdown.pullRequests.toFixed(2)}`);
      logger.info(`👀 Reviews: ${rewards.score.breakdown.reviews.toFixed(2)}`);
      logger.info(`🎯 Issues: ${rewards.score.breakdown.issues.toFixed(2)}\n`);

        if (rewards.achievements.length > 0) {
          logger.info('🌟 Achievements:');
          rewards.achievements.forEach(achievement => {
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

// Only parse if this is the main module
if (require.main === module) {
  program.parse();
} 