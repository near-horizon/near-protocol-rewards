/**
 * NEAR Protocol Consolidated Data Calculator
 * 
 * Calculates consolidated metrics from all project results for dashboard summary
 * including total rewards, activity metrics, and distribution charts data.
 */

import { Logger } from "../utils/logger";

/**
 * Interface for project result data coming from main processing
 */
export interface ProjectResult {
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

/**
 * Consolidated dashboard data structure
 */
export interface ConsolidatedDashboardData {
  summary: {
    totalRewards: number;
    totalVolumeTransaction: number;
    activeProjects: number;
    totalActivities: {
      commits: number;
      pullRequests: number;
      reviews: number;
      issues: number;
    };
    totalActivitiesSum: number;
  };
  charts: {
    topPerformerBreakdown: Array<{
      project: string;
      onchainScore: number;
      offchainBreakdown: {
        commits: number;
        pullRequests: number;
        reviews: number;
        issues: number;
      };
      totalScore: number;
      tier: string;
    }>;
    distributionByLevel: Array<{
      tier: string;
      count: number;
      totalReward: number;
      percentage: number;
    }>;
  };
  metadata: {
    period: string;
    generatedAt: string;
    totalProjectsProcessed: number;
    successfulProjects: number;
    failedProjects: number;
  };
}

/**
 * Main Consolidated Calculator Class
 */
export class ConsolidatedCalculator {
  private readonly logger?: Logger;

  constructor(logger?: Logger) {
    this.logger = logger;
  }

  /**
   * Logs a message if logger is available
   */
  private log(message: string, data?: any): void {
    if (this.logger) {
      this.logger.info(message, data);
    }
  }

  /**
   * Calculates consolidated dashboard data from all project results
   */
  calculateConsolidatedData(projectResults: ProjectResult[]): ConsolidatedDashboardData {
    this.log("🧮 Calculating consolidated dashboard data...");

    // Filter successful projects (those without errors)
    const successfulProjects = projectResults.filter(project => !project.error);
    const failedProjects = projectResults.filter(project => project.error);

    this.log(`📊 Processing ${successfulProjects.length} successful projects out of ${projectResults.length} total`);

    // Calculate summary metrics
    const summary = this.calculateSummaryMetrics(successfulProjects);
    
    // Calculate chart data
    const charts = this.calculateChartsData(successfulProjects);

    // Get period from first project (they should all have the same period)
    const period = projectResults.length > 0 ? projectResults[0].period : '';

    const consolidatedData: ConsolidatedDashboardData = {
      summary,
      charts,
      metadata: {
        period,
        generatedAt: new Date().toISOString(),
        totalProjectsProcessed: projectResults.length,
        successfulProjects: successfulProjects.length,
        failedProjects: failedProjects.length
      }
    };

    this.log("✅ Consolidated data calculation completed", {
      totalRewards: summary.totalRewards,
      activeProjects: summary.activeProjects,
      topPerformers: charts.topPerformerBreakdown.length,
      tierDistribution: charts.distributionByLevel.length
    });

    return consolidatedData;
  }

  /**
   * Safely converts a value to a number, returning 0 if invalid
   */
  private safeToNumber(value: any): number {
    if (value === null || value === undefined) {
      return 0;
    }
    
    if (typeof value === 'number') {
      return isNaN(value) ? 0 : value;
    }
    
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    
    // If it's an object or other type, return 0
    return 0;
  }

  /**
   * Calculates summary metrics from successful projects
   */
  private calculateSummaryMetrics(projects: ProjectResult[]): ConsolidatedDashboardData['summary'] {
    this.log("📈 Calculating summary metrics...");

    let totalRewards = 0; // Sum of final tier rewards (not duplicating onchain/offchain)
    let totalVolumeTransaction = 0;
    let activeProjects = 0;
    
    const totalActivities = {
      commits: 0,
      pullRequests: 0,
      reviews: 0,
      issues: 0
    };

    for (const project of projects) {
      // Count as active if has rewards_total data
      if (project.rewards_total) {
        activeProjects++;
        
        // Sum total rewards from tier reward (final calculated value)
        if (project.rewards_total.tier?.reward) {
          totalRewards += this.safeToNumber(project.rewards_total.tier.reward);
        }
      }

      // Sum transaction volume from on-chain data
      if (project.metrics_onchain?.transactionVolume) {
        totalVolumeTransaction += this.safeToNumber(project.metrics_onchain.transactionVolume);
      }

      // Sum activities from off-chain data
      if (project.metrics_offchain) {
        // Commits: get the count field
        totalActivities.commits += this.safeToNumber(project.metrics_offchain.commits?.count);
        
        // Pull Requests: sum open + merged + closed
        const prOpen = this.safeToNumber(project.metrics_offchain.pullRequests?.open);
        const prMerged = this.safeToNumber(project.metrics_offchain.pullRequests?.merged);
        const prClosed = this.safeToNumber(project.metrics_offchain.pullRequests?.closed);
        totalActivities.pullRequests += prOpen + prMerged + prClosed;
        
        // Reviews: get the count field
        totalActivities.reviews += this.safeToNumber(project.metrics_offchain.reviews?.count);
        
        // Issues: sum open + closed
        const issuesOpen = this.safeToNumber(project.metrics_offchain.issues?.open);
        const issuesClosed = this.safeToNumber(project.metrics_offchain.issues?.closed);
        totalActivities.issues += issuesOpen + issuesClosed;
      }
    }

    // Calculate total activities sum
    const totalActivitiesSum = totalActivities.commits + totalActivities.pullRequests + 
                               totalActivities.reviews + totalActivities.issues;

    this.log("✅ Summary metrics calculated", {
      totalRewards,
      totalVolumeTransaction,
      activeProjects,
      totalActivities,
      totalActivitiesSum
    });

    return {
      totalRewards,
      totalVolumeTransaction,
      activeProjects,
      totalActivities,
      totalActivitiesSum
    };
  }

  /**
   * Calculates chart data from successful projects
   */
  private calculateChartsData(projects: ProjectResult[]): ConsolidatedDashboardData['charts'] {
    this.log("📊 Calculating charts data...");

    // Calculate top performer breakdown
    const topPerformerBreakdown = this.calculateTopPerformerBreakdown(projects);
    
    // Calculate distribution by level
    const distributionByLevel = this.calculateDistributionByLevel(projects);

    this.log("✅ Charts data calculated", {
      topPerformers: topPerformerBreakdown.length,
      tierDistribution: distributionByLevel.length
    });

    return {
      topPerformerBreakdown,
      distributionByLevel
    };
  }

  /**
   * Calculates top performer contribution breakdown
   */
  private calculateTopPerformerBreakdown(projects: ProjectResult[]): ConsolidatedDashboardData['charts']['topPerformerBreakdown'] {
    const breakdown = projects
      .filter(project => project.rewards_total) // Only projects with total rewards
      .map(project => ({
        project: project.project,
        onchainScore: project.rewards_total?.onchainScore || 0,
        offchainBreakdown: {
          commits: project.rewards_total?.breakdown?.offchain?.commits || 0,
          pullRequests: project.rewards_total?.breakdown?.offchain?.pullRequests || 0,
          reviews: project.rewards_total?.breakdown?.offchain?.reviews || 0,
          issues: project.rewards_total?.breakdown?.offchain?.issues || 0
        },
        totalScore: project.rewards_total?.totalScore || 0,
        tier: project.rewards_total?.tier?.name || 'Unknown'
      }))
      .sort((a, b) => b.totalScore - a.totalScore); // Sort by total score descending

    return breakdown;
  }

  /**
   * Calculates distribution by reward level
   */
  private calculateDistributionByLevel(projects: ProjectResult[]): ConsolidatedDashboardData['charts']['distributionByLevel'] {
    // Group projects by tier
    const tierGroups = new Map<string, { count: number; totalReward: number }>();

    for (const project of projects) {
      if (project.rewards_total?.tier) {
        const tierName = project.rewards_total.tier.name;
        const reward = project.rewards_total.tier.reward || 0;
        
        if (!tierGroups.has(tierName)) {
          tierGroups.set(tierName, { count: 0, totalReward: 0 });
        }
        
        const group = tierGroups.get(tierName)!;
        group.count += 1;
        group.totalReward += reward;
      }
    }

    // Calculate total projects for percentage calculation
    const totalProjects = projects.filter(p => p.rewards_total?.tier).length;

    // Convert to array and add percentages
    const distribution = Array.from(tierGroups.entries()).map(([tier, data]) => ({
      tier,
      count: data.count,
      totalReward: data.totalReward,
      percentage: totalProjects > 0 ? (data.count / totalProjects) * 100 : 0
    }));

    // Sort by tier hierarchy (Diamond first, then Gold, etc.)
    const tierOrder = ['Diamond', 'Gold', 'Silver', 'Bronze', 'Contributor', 'Explorer', 'Member'];
    distribution.sort((a, b) => {
      const aIndex = tierOrder.indexOf(a.tier);
      const bIndex = tierOrder.indexOf(b.tier);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    return distribution;
  }

  /**
   * Gets a summary string for logging purposes
   */
  getSummaryString(data: ConsolidatedDashboardData): string {
    return `
🏆 DASHBOARD SUMMARY
====================
💰 Total Rewards: $${data.summary.totalRewards.toLocaleString()}
📊 Transaction Volume: $${data.summary.totalVolumeTransaction.toLocaleString()}
🚀 Active Projects: ${data.summary.activeProjects}
📈 Total Activities: ${data.summary.totalActivitiesSum}
   - Commits: ${data.summary.totalActivities.commits}
   - Pull Requests: ${data.summary.totalActivities.pullRequests}
   - Reviews: ${data.summary.totalActivities.reviews}
   - Issues: ${data.summary.totalActivities.issues}

🎯 TOP PERFORMERS (Top 5):
${data.charts.topPerformerBreakdown.slice(0, 5).map((p, i) => 
  `${i + 1}. ${p.project} - ${p.totalScore.toFixed(1)} pts (${p.tier})`
).join('\n')}

🏅 TIER DISTRIBUTION:
${data.charts.distributionByLevel.map(d => 
  `${d.tier}: ${d.count} projects (${d.percentage.toFixed(1)}%)`
).join('\n')}
====================`;
  }
} 