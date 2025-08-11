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
import { ConsolidatedCalculator } from './calculator/consolidated';
import { Logger, LogLevel } from './utils/logger';
import { ErrorCode } from './types/errors';
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
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-2' });

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
  dashboard?: string;
}

interface LocalSaveResult {
  monthly: string;
  daily: string;
  dashboard: string;
}

interface LogsSaveResult {
  logs: string;
}

/**
 * Helper to determine if an error is a rate limit error
 */
function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const anyErr = error as { code?: string };
  return anyErr.code === ErrorCode.RATE_LIMITED || anyErr.code === ErrorCode.RATE_LIMIT_EXCEEDED;
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

/**
 * Saves all results locally (simulating S3 structure for testing)
 */
function saveResultsLocally(results: ProjectResult[], year: number, month: number, currentDate: Date, consolidatedData: any): LocalSaveResult {
  try {
    logger.info('💾 Saving all data locally...');
    
    const outputDir = path.join(__dirname, '..', 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create subdirectories to simulate S3 structure
    const rewardsDir = path.join(outputDir, 'rewards');
    const historicalDir = path.join(outputDir, 'historical');
    const dashboardDir = path.join(outputDir, 'dashboard');
    
    [rewardsDir, historicalDir, dashboardDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Save monthly file (simulating S3 rewards folder)
    const monthlyFilePath = path.join(rewardsDir, `onchain_offchain_metrics_${year}_${month.toString().padStart(2, '0')}.json`);
    fs.writeFileSync(monthlyFilePath, JSON.stringify(results, null, 2));
    logger.info(`✅ Monthly data saved locally: ${monthlyFilePath}`);

    // Save daily file (simulating S3 historical folder)
    const dailyFilePath = path.join(historicalDir, `onchain_offchain_metrics_${year}_${month.toString().padStart(2, '0')}_${currentDate.getDate().toString().padStart(2, '0')}.json`);
    fs.writeFileSync(dailyFilePath, JSON.stringify(results, null, 2));
    logger.info(`✅ Daily data saved locally: ${dailyFilePath}`);

    // Save consolidated dashboard file (simulating S3 dashboard folder)
    const consolidatedFilePath = path.join(dashboardDir, `consolidated_metrics_${year}_${month.toString().padStart(2, '0')}.json`);
    fs.writeFileSync(consolidatedFilePath, JSON.stringify(consolidatedData, null, 2));
    logger.info(`✅ Dashboard data saved locally: ${consolidatedFilePath}`);

    // Summary of all files created
    logger.info('\n📁 All files saved locally (S3 simulation):');
    logger.info(`  📊 Monthly: ${monthlyFilePath}`);
    logger.info(`  📅 Daily: ${dailyFilePath}`);
    logger.info(`  🎯 Dashboard: ${consolidatedFilePath}`);
    
    return {
      monthly: monthlyFilePath,
      daily: dailyFilePath,
      dashboard: consolidatedFilePath
    };
    
  } catch (error) {
    logger.error('❌ Failed to save data locally', { error });
    throw new Error(`Failed to save results locally: ${error}`);
  }
}

async function saveResultsToS3(results: ProjectResult[], year: number, month: number, currentDate: Date, dashboardData?: any): Promise<S3SaveResult> {
  try {
    const bucketName = "near-protocol-rewards-data-dashboard";
    
    // Monthly file
    const monthlyFileKey = `rewards/onchain_offchain_metrics_${year}_${month.toString().padStart(2, '0')}.json`;
    
    // Daily file
    const dailyFileKey = `historical/onchain_offchain_metrics_${year}_${month.toString().padStart(2, '0')}_${currentDate.getDate().toString().padStart(2, '0')}.json`;
    
    // Dashboard consolidated data file
    const dashboardFileKey = `dashboard/consolidated_metrics_${year}_${month.toString().padStart(2, '0')}.json`;
    
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
    
    let dashboardPath;
    
    // Save dashboard consolidated data if provided
    if (dashboardData) {
      const dashboardJson = JSON.stringify(dashboardData, null, 2);
      
      const dashboardCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: dashboardFileKey,
        Body: dashboardJson,
        ContentType: "application/json"
      });
      
      await s3Client.send(dashboardCommand);
      dashboardPath = `s3://${bucketName}/${dashboardFileKey}`;
    }
    
    const monthlyPath = `s3://${bucketName}/${monthlyFileKey}`;
    const dailyPath = `s3://${bucketName}/${dailyFileKey}`;
    
    logger.info('✅ Files saved successfully to S3:');
    logger.info(`  - Monthly: ${monthlyPath}`);
    logger.info(`  - Daily: ${dailyPath}`);
    if (dashboardPath) {
      logger.info(`  - Dashboard: ${dashboardPath}`);
    }
    
    return {
      monthly: monthlyPath,
      daily: dailyPath,
      dashboard: dashboardPath
    };
    
  } catch (error) {
    logger.error('❌ Error saving to S3', { error });
    throw new Error(`Failed to save results to S3: ${error}`);
  }
}

async function saveLogsToS3(year: number, month: number, currentDate: Date, logsJson: string): Promise<LogsSaveResult> {
  try {
    const bucketName = "near-protocol-rewards-data-dashboard";
    const logsKey = `logs/run_${year}_${month.toString().padStart(2, '0')}_${currentDate.getDate().toString().padStart(2, '0')}_${currentDate.toISOString().split('T')[1].replace(/[:.Z]/g, '-')}.json`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: logsKey,
      Body: logsJson,
      ContentType: "application/json"
    });

    await s3Client.send(command);

    const logsPath = `s3://${bucketName}/${logsKey}`;
    logger.info(`✅ Logs saved to S3: ${logsPath}`);

    return { logs: logsPath };
  } catch (error) {
    logger.error('❌ Error saving logs to S3', { error });
    throw new Error(`Failed to save logs to S3: ${error}`);
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
        if (!transactionData) {
          logger.warn(`⚠️ On-chain account not found or no data for ${project.wallet}. Skipping on-chain metrics.`);
        } else {
          // Calculate metrics from raw data
          const metricsOnchain = onchainCalculator.calculateOnchainMetricsFromTransactionData(transactionData);
          
          // Calculate on-chain rewards
          const onchainResult = onchainCalculator.calculateOnchainScores(metricsOnchain);
          rewardsOnchain = onchainResult;

          projectResult.metrics_onchain = metricsOnchain;
          projectResult.rewards_onchain = rewardsOnchain;
          projectResult.rawdata_onchain = transactionData;

          logger.info(`✅ On-chain data processed for ${project.wallet}`);
        }
      } catch (error) {
        logger.error(`❌ Error processing on-chain data for ${project.wallet}`, { error });
        if (isRateLimitError(error)) {
          // Propagate to stop the whole pipeline
          throw error;
        }
        projectResult.error = `On-chain error: ${String((error as Error)?.message || error)}`;
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

          try {
            const collector = new OffchainCollector({
              token: GITHUB_TOKEN!,
              repo,
              logger,
              rateLimiter
            });
            const metrics = await collector.collectData(year, month);
            repositoryMetrics.push(metrics);
          } catch (error) {
            logger.error(`❌ Error collecting metrics for repo ${repo}`, { error });
            if (isRateLimitError(error)) {
              throw error; // stop everything on rate limit
            }
            // For NOT_FOUND or other non-critical errors, continue to next repo
          }

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
        if (isRateLimitError(error)) {
          throw error;
        }
        projectResult.error = `Off-chain error: ${String((error as Error)?.message || error)}`;
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
        if (isRateLimitError(error)) {
          throw error;
        }
        projectResult.error = `Total rewards error: ${String((error as Error)?.message || error)}`;
      }
    }

    return projectResult;
  } catch (error) {
    logger.error(`❌ Error processing project ${project.project}`, { error });
    if (isRateLimitError(error)) {
      throw error;
    }
    projectResult.error = `General error: ${String((error as Error)?.message || error)}`;
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
    const consolidatedCalculator = new ConsolidatedCalculator(logger);
    
    const results: ProjectResult[] = [];
    
    // Process each project (only fail fast on rate limit)
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
      } catch (error) {
        logger.error(`❌ Error processing project ${project.project}`, { error });
        if (isRateLimitError(error)) {
          throw error; // stop entire run
        }
        const errorResult: ProjectResult = {
          project: project.project,
          wallet: project.wallet,
          website: project.website || "",
          repository: project.repository || [],
          period: `${year}-${month.toString().padStart(2, '0')}`,
          timestamp: currentDate.toISOString(),
          error: `${String((error as Error)?.message || error)}`
        };
        results.push(errorResult);
      }

      // Add delay every 5 projects to respect API rate limits
      if ((index + 1) % 5 === 0 && index < projects.length - 1) {
        logger.info('⏳ Waiting 1 minute to respect API rate limits...');
        await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute
      }
    }
    
    // Output final results
    logger.info('\n🎉 Processing completed! Final results:');
    logger.info(`📊 Projects processed: ${results.length}`);
    logger.info(`✅ Successful projects: ${results.filter(p => !p.error).length}`);
    logger.info(`❌ Failed projects: ${results.filter(p => p.error).length}`);

    // Calculate consolidated dashboard data
    logger.info('\n📊 Calculating consolidated dashboard data...');
    const consolidatedData = consolidatedCalculator.calculateConsolidatedData(results);
    
    // Display consolidated summary
    const summaryString = consolidatedCalculator.getSummaryString(consolidatedData);
    logger.info(summaryString);

    // Save all data locally (fail fast on error)
    const localPaths = saveResultsLocally(results, year, month, currentDate, consolidatedData);
    logger.info('✅ All data saved locally successfully!');
       
    // Save results to S3 if enabled
    if (SAVE_ON_S3) {
      logger.info('📤 Saving results to S3...');
      const s3Paths = await saveResultsToS3(results, year, month, currentDate, consolidatedData);
      logger.info('✅ Results successfully saved to S3!');

      // Save logs to S3 as well
      const logsJson = JSON.stringify({
        period: `${year}-${month.toString().padStart(2, '0')}`,
        timestamp: currentDate.toISOString(),
        logs: logger.getEntries(),
      }, null, 2);
      await saveLogsToS3(year, month, currentDate, logsJson);
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
    // Attempt to save logs to S3 on failure (best-effort)
    try {
      if (SAVE_ON_S3) {
        const now = new Date();
        const logsJson = JSON.stringify({
          period: `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}`,
          timestamp: now.toISOString(),
          error: String(error),
          logs: logger.getEntries(),
        }, null, 2);
        await saveLogsToS3(now.getFullYear(), now.getMonth()+1, now, logsJson);
      }
    } catch (e) {
      // Ignore secondary failure while saving logs
    }
    process.exit(1);
  }
}

main(); 