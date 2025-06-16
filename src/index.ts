/**
 * NEAR Protocol Rewards - Main Entry Point
 */

import dotenv from 'dotenv';
import { OffchainCollector } from './collectors/offchain';
import { OnchainCollector } from './collectors/onchain';
import { OnchainCalculator } from './calculator/onchain';
import { OffchainCalculator } from './calculator/offchain';
import { RewardsCalculator } from './calculator/rewards';
import { Logger, LogLevel } from './utils/logger';
import { RateLimiter } from './utils/rate-limiter';
import { GitHubMetrics } from './types/metrics';

// Load environment variables
dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const NEARBLOCKS_API_KEY = process.env.NEARBLOCKS_API_KEY;

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN environment variable is required');
  process.exit(1);
}

if (!NEARBLOCKS_API_KEY) {
  console.error('❌ NEARBLOCKS_API_KEY environment variable is required');
  process.exit(1);
}

// Create logger and rate limiter
const logger = new Logger(LogLevel.INFO, 'NEAR Rewards');
const rateLimiter = new RateLimiter(60, 60); // 60 requests per minute

async function main() {
  try {
    // Example repositories
    const repositories = [
      'aigamblingclub/monorepo'
    ];
    
    // Example NEAR wallets
    const wallets = [
      'aigamblingclub.near'
    ];
    
    // May 2025
    const year = 2025;
    const month = 5; // May
    
    logger.info(`🚀 Starting data collection for ${month}/${year}`);
    
    // Create calculators
    const offchainCalculator = new OffchainCalculator(logger);
    const onchainCalculator = new OnchainCalculator(logger);
    const rewardsCalculator = new RewardsCalculator(logger);
    
    // Collect all repository metrics
    const repositoryMetrics: GitHubMetrics[] = [];
    
    // Process off-chain data (GitHub repositories)
    for (const repo of repositories) {
      logger.info(`📊 Processing repository: ${repo}`);
      
      const collector = new OffchainCollector({
        token: GITHUB_TOKEN!,
        repo,
        logger,
        rateLimiter
      });
      
      // Test connection
      await collector.testConnection();
      
      // Collect data
      const metrics = await collector.collectData(year, month);
      repositoryMetrics.push(metrics);
      
      // Output results for validation
      logger.info(`✅ Metrics collected for ${repo}:`, {
        commits: {
          total: metrics.commits.count,
          authors: metrics.commits.authors.length,
          frequency: metrics.commits.frequency
        },
        pullRequests: {
          open: metrics.pullRequests.open,
          merged: metrics.pullRequests.merged,
          closed: metrics.pullRequests.closed,
          authors: metrics.pullRequests.authors.length
        },
        reviews: {
          total: metrics.reviews.count,
          authors: metrics.reviews.authors.length
        },
        issues: {
          open: metrics.issues.open,
          closed: metrics.issues.closed,
          participants: metrics.issues.participants.length
        },
        metadata: metrics.metadata
      });
    }
    
    // Combine all repository metrics and calculate off-chain scores
    if (repositoryMetrics.length > 0) {
      logger.info('\n🧮 Calculating combined off-chain scores...');
      
      // Combine metrics from all repositories
      const combinedMetrics = offchainCalculator.combineRepositoryMetrics(repositoryMetrics);
      
      // Calculate off-chain scores
      const offchainResult = offchainCalculator.calculateOffchainScores(combinedMetrics);
      
      logger.info('✅ Off-chain calculation completed:', {
        totalScore: `${offchainResult.totalScore.toFixed(2)}/80`,
        breakdown: {
          commits: `${offchainResult.scoreBreakdown.commits.toFixed(2)}/28`,
          pullRequests: `${offchainResult.scoreBreakdown.pullRequests.toFixed(2)}/22`,
          reviews: `${offchainResult.scoreBreakdown.reviews.toFixed(2)}/16`,
          issues: `${offchainResult.scoreBreakdown.issues.toFixed(2)}/14`
        }
      });
    }
    
    // Process on-chain data (NEAR wallets) - Demo with first wallet
    if (wallets.length > 0) {
      const wallet = wallets[0]; // Use first wallet for demo
      logger.info(`\n🔗 Processing NEAR wallet: ${wallet}`);
      
      const onchainCollector = new OnchainCollector({
        apiKey: NEARBLOCKS_API_KEY!,
        accountId: wallet,
        logger,
        rateLimiter
      });
      
      // Test connection
      await onchainCollector.testConnection();
      
      // Collect on-chain data
      const transactionData = await onchainCollector.collectData(year, month);
      
      // Calculate metrics from raw data
      const metrics = onchainCalculator.calculateOnchainMetricsFromTransactionData(transactionData);
      
      // Calculate on-chain scores
      const onchainResult = onchainCalculator.calculateOnchainScores(metrics);
      
      logger.info('✅ On-chain calculation completed:', {
        totalScore: `${onchainResult.totalScore.toFixed(2)}/20`,
        breakdown: {
          transactionVolume: `${onchainResult.scoreBreakdown.transactionVolume.toFixed(2)}/8`,
          smartContractCalls: `${onchainResult.scoreBreakdown.smartContractCalls.toFixed(2)}/8`,
          uniqueWallets: `${onchainResult.scoreBreakdown.uniqueWallets.toFixed(2)}/4`
        },
        rawMetrics: {
          transactionVolume: `${metrics.transactionVolume.toFixed(4)} NEAR`,
          contractInteractions: metrics.contractInteractions,
          uniqueWallets: metrics.uniqueWallets,
          transactionCount: metrics.transactionCount
        }
      });
      
      // Calculate final rewards combining both on-chain and off-chain (if available)
      if (repositoryMetrics.length > 0) {
        logger.info('\n🏆 Calculating final rewards...');
        
        const combinedMetrics = offchainCalculator.combineRepositoryMetrics(repositoryMetrics);
        const offchainResult = offchainCalculator.calculateOffchainScores(combinedMetrics);
        
        const finalRewards = rewardsCalculator.calculateTotalRewards(onchainResult, offchainResult);
        
        logger.info('🎉 Final rewards calculation completed!', {
          totalScore: `${finalRewards.totalScore.toFixed(2)}/100`,
          tier: `${finalRewards.tier.emoji} ${finalRewards.tier.name}`,
          reward: `$${finalRewards.tier.reward.toLocaleString()}`,
          breakdown: {
            onchain: `${finalRewards.onchainScore.toFixed(2)}/20 (20%)`,
            offchain: `${finalRewards.offchainScore.toFixed(2)}/80 (80%)`
          },
          weights: finalRewards.metadata.weights
        });
      }
    }
    
    logger.info('\n✅ Data collection and rewards calculation completed successfully!');
  } catch (error) {
    logger.error('❌ Error in main process', { error });
    process.exit(1);
  }
}

main(); 