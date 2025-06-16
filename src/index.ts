/**
 * NEAR Protocol Rewards - Main Entry Point
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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
const SAVE_ON_S3 = process.env.SAVE_ON_S3 || false; // Set SAVE_ON_S3=true in .env to save results on AWS S3

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

// Create S3 client
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

interface ProjectData {
  project: string;
  wallet: string;
  website?: string;
  repository: string[];
}

interface ProjectResult {
  project: string;
  wallet: string;
  website: string;
  repository: string[];
  period: string;
  timestamp: string;
  metrics_onchain?: any;
  rewards_onchain?: any;
  rawdata_onchain?: any;
  metrics_offchain?: any;
  rewards_offchain?: any;
  rawdata_offchain?: any;
  rewards_total?: any;
  error?: string;
}

interface S3SaveResult {
  monthly: string;
  daily: string;
}

function loadProjectsData(): ProjectData[] {
  try {
    const dataPath = path.join(__dirname, 'data.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const projects = JSON.parse(rawData);
    logger.info(`✅ Projects loaded successfully: ${projects.length} projects found`);
    return projects;
  } catch (error) {
    logger.error('❌ Error loading data.json', { error });
    throw new Error(`Failed to load projects data: ${error}`);
  }
}

async function saveResultsToS3(results: ProjectResult[], year: number, month: number, currentDate: Date): Promise<S3SaveResult> {
  try {
    const bucketName = "near-protocol-rewards-data-dashboard";
    
    // Monthly file
    const monthlyFileKey = `rewards/onchain_offchain_metrics_${year}_${month.toString().padStart(2, '0')}.json`;
    
    // Daily file
    const dailyFileKey = `historical/onchain_offchain_metrics_${year}_${month.toString().padStart(2, '0')}_${currentDate.getDate().toString().padStart(2, '0')}.json`;
    
    const resultsJson = JSON.stringify(results, null, 2);
    
    // Save monthly file
    const monthlyCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: monthlyFileKey,
      Body: resultsJson,
      ContentType: "application/json"
    });
    
    await s3Client.send(monthlyCommand);
    
    // Save daily file
    const dailyCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: dailyFileKey,
      Body: resultsJson,
      ContentType: "application/json"
    });
    
    await s3Client.send(dailyCommand);
    
    const monthlyPath = `s3://${bucketName}/${monthlyFileKey}`;
    const dailyPath = `s3://${bucketName}/${dailyFileKey}`;
    
    logger.info('✅ Files saved successfully to S3:');
    logger.info(`  - Monthly: ${monthlyPath}`);
    logger.info(`  - Daily: ${dailyPath}`);
    
    return {
      monthly: monthlyPath,
      daily: dailyPath
    };
    
  } catch (error) {
    logger.error('❌ Error saving to S3', { error });
    throw new Error(`Failed to save results to S3: ${error}`);
  }
}

async function processProject(
  project: ProjectData,
  year: number,
  month: number,
  offchainCalculator: OffchainCalculator,
  onchainCalculator: OnchainCalculator,
  rewardsCalculator: RewardsCalculator
): Promise<ProjectResult> {
  const currentDate = new Date();
  const projectResult: ProjectResult = {
    project: project.project,
    wallet: project.wallet,
    website: project.website || "",
    repository: project.repository || [],
    period: `${year}-${month.toString().padStart(2, '0')}`,
    timestamp: currentDate.toISOString()
  };

  try {
    let rewardsOnchain: any = undefined;
    let rewardsOffchain: any = undefined;

    // Process on-chain data if wallet exists
    if (project.wallet) {
      logger.info(`📊 Collecting on-chain data for ${project.wallet}...`);
      
      try {
        const onchainCollector = new OnchainCollector({
          apiKey: NEARBLOCKS_API_KEY!,
          accountId: project.wallet,
          logger,
          rateLimiter
        });

        // Collect transaction data
        const transactionData = await onchainCollector.collectData(year, month);
        
        // Calculate metrics from raw data
        const metricsOnchain = onchainCalculator.calculateOnchainMetricsFromTransactionData(transactionData);
        
        // Calculate on-chain rewards
        const onchainResult = onchainCalculator.calculateOnchainScores(metricsOnchain);
        rewardsOnchain = onchainResult;

        projectResult.metrics_onchain = metricsOnchain;
        projectResult.rewards_onchain = rewardsOnchain;
        projectResult.rawdata_onchain = transactionData;

        logger.info(`✅ On-chain data processed for ${project.wallet}`);
      } catch (error) {
        logger.error(`❌ Error processing on-chain data for ${project.wallet}`, { error });
        projectResult.error = `On-chain error: ${error}`;
      }
    }

    // Process off-chain data if repositories exist
    if (project.repository && project.repository.length > 0) {
      logger.info(`📈 Collecting off-chain data for repositories...`);
      
      try {
        const repositoryMetrics: GitHubMetrics[] = [];
        
        // Process each repository
        for (const repo of project.repository) {
          logger.info(`🔍 Analyzing repository: ${repo}`);
          
          const collector = new OffchainCollector({
            token: GITHUB_TOKEN!,
            repo,
            logger,
            rateLimiter
          });
          
          const metrics = await collector.collectData(year, month);
          repositoryMetrics.push(metrics);
          
          // Add small delay between repositories to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (repositoryMetrics.length > 0) {
          // Combine metrics from all repositories
          const combinedMetrics = offchainCalculator.combineRepositoryMetrics(repositoryMetrics);
          
          // Calculate off-chain rewards
          const offchainResult = offchainCalculator.calculateOffchainScores(combinedMetrics);
          rewardsOffchain = offchainResult;

          projectResult.metrics_offchain = combinedMetrics;
          projectResult.rewards_offchain = rewardsOffchain;
          projectResult.rawdata_offchain = repositoryMetrics;

          logger.info(`✅ Off-chain data processed for ${project.repository.length} repositories`);
        }
      } catch (error) {
        logger.error(`❌ Error processing off-chain data for ${project.project}`, { error });
        projectResult.error = `Off-chain error: ${error}`;
      }
    }

    // Calculate total rewards if we have at least one type of data
    if (rewardsOnchain || rewardsOffchain) {
      try {
        const totalRewards = rewardsCalculator.calculateTotalRewards(rewardsOnchain, rewardsOffchain);
        projectResult.rewards_total = totalRewards;
        logger.info(`✅ Total rewards calculated for ${project.project}`);
      } catch (error) {
        logger.error(`❌ Error calculating total rewards for ${project.project}`, { error });
        projectResult.error = `Total rewards error: ${error}`;
      }
    }

    return projectResult;
  } catch (error) {
    logger.error(`❌ Error processing project ${project.project}`, { error });
    projectResult.error = `General error: ${error}`;
    return projectResult;
  }
}

async function main() {
  try {
    // Load projects from data.json
    const projects = loadProjectsData();
    
    // Set processing period (current month/year or could be parameterized)
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    
    logger.info(`🚀 Starting data collection for ${month}/${year}`);
    logger.info(`🔍 Total projects to process: ${projects.length}`);
    
    // Create calculators
    const offchainCalculator = new OffchainCalculator(logger);
    const onchainCalculator = new OnchainCalculator(logger);
    const rewardsCalculator = new RewardsCalculator(logger);
    
    const results: ProjectResult[] = [];
    
    // Process each project
    for (let index = 0; index < projects.length; index++) {
      const project = projects[index];
      logger.info(`\n🔄 Processing project: ${project.project} (${index + 1}/${projects.length})`);
      
      try {
        const projectResult = await processProject(
          project,
          year,
          month,
          offchainCalculator,
          onchainCalculator,
          rewardsCalculator
        );
        
        results.push(projectResult);
        logger.info(`✅ Project ${project.project} processed successfully!`);
        
        // Add delay every 3 projects to respect API rate limits
        if ((index + 1) % 3 === 0 && index < projects.length - 1) {
          logger.info('⏳ Waiting 1 minutee to respect API rate limits...');
          await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute
        }
        
      } catch (error) {
        logger.error(`❌ Error processing project ${project.project}`, { error });
        const errorResult: ProjectResult = {
          project: project.project,
          wallet: project.wallet,
          website: project.website || "",
          repository: project.repository || [],
          period: `${year}-${month.toString().padStart(2, '0')}`,
          timestamp: currentDate.toISOString(),
          error: `${error}`
        };
        results.push(errorResult);
      }
    }
    
    // Output final results
    logger.info('\n🎉 Processing completed! Final results:');
    logger.info(`📊 Projects processed: ${results.length}`);
    logger.info(`✅ Successful projects: ${results.filter(p => !p.error).length}`);
    logger.info(`❌ Failed projects: ${results.filter(p => p.error).length}`);
    
    // Save results to JSON file for inspection
    const outputPath = path.join(__dirname, '..', 'output', `rewards_${year}_${month.toString().padStart(2, '0')}.json`);
    
    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    logger.info(`💾 Results saved to: ${outputPath}`);
    
    // Save results to S3 if enabled
    if (SAVE_ON_S3) {
      try {
        logger.info('📤 Saving results to S3...');
        const s3Paths = await saveResultsToS3(results, year, month, currentDate);
        logger.info('✅ Results successfully saved to S3!');
      } catch (error) {
        logger.error('❌ Failed to save results to S3', { error });
        // Continue execution even if S3 save fails
      }
    }
    
    // Log summary for each project
    results.forEach((result, index) => {
      logger.info(`\n📋 Project ${index + 1}: ${result.project}`);
      if (result.error) {
        logger.error(`   ❌ Error: ${result.error}`);
      } else {
        if (result.rewards_total) {
          logger.info(`   🏆 Total Score: ${result.rewards_total.totalScore?.toFixed(2) || 'N/A'}/100`);
          logger.info(`   💰 Tier: ${result.rewards_total.tier?.name || 'N/A'}`);
          logger.info(`   💵 Reward: $${result.rewards_total.tier?.reward?.toLocaleString() || 'N/A'}`);
        }
        if (result.rewards_onchain) {
          logger.info(`   🔗 On-chain Score: ${result.rewards_onchain.totalScore?.toFixed(2) || 'N/A'}/20`);
        }
        if (result.rewards_offchain) {
          logger.info(`   📈 Off-chain Score: ${result.rewards_offchain.totalScore?.toFixed(2) || 'N/A'}/80`);
        }
      }
    });
    
    logger.info('\n✅ All projects processed successfully!');
    
  } catch (error) {
    logger.error('❌ Error in main process', { error });
    process.exit(1);
  }
}

main(); 