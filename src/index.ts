/**
 * NEAR Protocol Rewards - Main Entry Point
 */

import dotenv from 'dotenv';
import { OffchainCollector } from './collectors/offchain';
import { Logger, LogLevel } from './utils/logger';
import { RateLimiter } from './utils/rate-limiter';

// Load environment variables
dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN environment variable is required');
  process.exit(1);
}

// Create logger and rate limiter
const logger = new Logger(LogLevel.INFO, 'NEAR Rewards');
const rateLimiter = new RateLimiter(60, 60); // 60 requests per minute

async function main() {
  try {
    // Example repositories
    const repositories = [
      'beneviolabs/ft-allowance-agent',
      'aigamblingclub/monorepo'
    ];
    
    // March 2025
    const year = 2025;
    const month = 5; // March
    
    logger.info(`🚀 Starting data collection for ${month}/${year}`);
    
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
      
      // Collect metrics
      const metrics = await collector.collectMetrics(year, month);
      
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
      
      // Log detailed author information for validation
      logger.info(`📋 Detailed data for ${repo}:`, {
        commitAuthors: metrics.commits.authors,
        prAuthors: metrics.pullRequests.authors,
        reviewAuthors: metrics.reviews.authors,
        issueParticipants: metrics.issues.participants
      });
    }
    
    logger.info('✅ Data collection completed successfully');
  } catch (error) {
    logger.error('❌ Error in main process', { error });
    process.exit(1);
  }
}

main(); 