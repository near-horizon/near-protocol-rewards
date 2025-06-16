/**
 * NEAR On-chain Metrics Calculator
 * 
 * Processes raw on-chain metrics and calculates normalized scores
 * without applying final reward weights. This provides the base
 * data for the main rewards calculator.
 */

import { OnchainMetrics, NearTransactionData } from "../types/metrics";
import { OnchainScoreBreakdown, OnchainCalculationResult } from "../types/rewards";
import { Logger } from "../utils/logger";

/**
 * NEAR On-chain Calculator Class
 */
export class OnchainCalculator {
  private readonly logger?: Logger;

  // Thresholds for maximum points (based on cohort 2 requirements)
  private readonly thresholds = {
    transactionVolume: 10000, // $10,000+ for max points
    smartContractCalls: 500,  // 500+ calls for max points
    uniqueWallets: 100        // 100+ distinct wallets for max points
  };

  // Maximum points per category (total 20 points for on-chain)
  private readonly maxPoints = {
    transactionVolume: 8,     // 8 points max
    smartContractCalls: 8,    // 8 points max
    uniqueWallets: 4,         // 4 points max
    total: 20                 // 20 points total for on-chain
  };

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
   * Calculates on-chain metrics from raw transaction data
   * This function was moved from the collector to maintain separation of concerns
   */
  calculateOnchainMetricsFromTransactionData(transactionData: NearTransactionData): OnchainMetrics {
    let totalVolume = 0;
    let contractInteractions = 0;
    const uniqueWallets = new Set<string>();
    
    for (const tx of transactionData.transactions) {
      // Volume calculation - simplified with actions_agg
      totalVolume += tx.actions_agg.deposit;
      
      // Contract interactions count
      if (tx.actions) {
        for (const action of tx.actions) {
          if (action.action === "FUNCTION_CALL") {
            contractInteractions++;
          }
        }
      }
      
      // Unique wallets - using signer and receiver
      const accountId = transactionData.metadata.account_id;
      if (tx.signer_account_id && tx.signer_account_id !== accountId) {
        uniqueWallets.add(tx.signer_account_id);
      }
      if (tx.receiver_account_id && tx.receiver_account_id !== accountId) {
        uniqueWallets.add(tx.receiver_account_id);
      }
    }

    const metrics: OnchainMetrics = {
      transactionVolume: totalVolume / (10**24), // Convert from yoctoNEAR to NEAR
      contractInteractions,
      uniqueWallets: uniqueWallets.size,
      transactionCount: transactionData.transactions.length,
      metadata: {
        collectionTimestamp: Date.now(),
        source: 'nearblocks',
        projectId: transactionData.metadata.account_id
      }
    };

    this.log("📊 On-chain metrics calculated:");
    this.log(`   - Transaction volume: ${metrics.transactionVolume} NEAR`);
    this.log(`   - Contract interactions: ${metrics.contractInteractions}`);
    this.log(`   - Unique wallets: ${metrics.uniqueWallets}`);
    this.log(`   - Total transactions: ${metrics.transactionCount}`);

    return metrics;
  }

  /**
   * Calculates transaction volume score
   * Converts NEAR amount to USD equivalent and calculates score
   */
  private calculateTransactionVolumeScore(volumeNear: number, nearPriceUsd: number = 5): number {
    const volumeUsd = volumeNear * nearPriceUsd;
    const score = Math.min(volumeUsd / this.thresholds.transactionVolume, 1) * this.maxPoints.transactionVolume;
    
    this.log(`📈 Transaction Volume Score:`, {
      volumeNear,
      nearPriceUsd,
      volumeUsd,
      threshold: this.thresholds.transactionVolume,
      score: score.toFixed(2)
    });

    return score;
  }

  /**
   * Calculates smart contract calls score
   */
  private calculateSmartContractCallsScore(contractInteractions: number): number {
    const score = Math.min(contractInteractions / this.thresholds.smartContractCalls, 1) * this.maxPoints.smartContractCalls;
    
    this.log(`🔗 Smart Contract Calls Score:`, {
      contractInteractions,
      threshold: this.thresholds.smartContractCalls,
      score: score.toFixed(2)
    });

    return score;
  }

  /**
   * Calculates unique wallets score
   */
  private calculateUniqueWalletsScore(uniqueWallets: number): number {
    const score = Math.min(uniqueWallets / this.thresholds.uniqueWallets, 1) * this.maxPoints.uniqueWallets;
    
    this.log(`👥 Unique Wallets Score:`, {
      uniqueWallets,
      threshold: this.thresholds.uniqueWallets,
      score: score.toFixed(2)
    });

    return score;
  }

  /**
   * Processes on-chain metrics and calculates normalized scores
   * 
   * @param metrics Raw on-chain metrics from collector
   * @param nearPriceUsd Current NEAR price in USD (default: $5)
   * @returns Calculation result with scores and metadata
   */
  calculateOnchainScores(metrics: OnchainMetrics, nearPriceUsd: number = 5): OnchainCalculationResult {
    this.log("🧮 Calculando pontuações on-chain");
    
    // Calculate individual scores
    const transactionVolumeScore = this.calculateTransactionVolumeScore(
      metrics.transactionVolume, 
      nearPriceUsd
    );
    
    const smartContractCallsScore = this.calculateSmartContractCallsScore(
      metrics.contractInteractions
    );
    
    const uniqueWalletsScore = this.calculateUniqueWalletsScore(
      metrics.uniqueWallets
    );

    // Calculate total score
    const totalScore = transactionVolumeScore + smartContractCallsScore + uniqueWalletsScore;

    const scoreBreakdown: OnchainScoreBreakdown = {
      transactionVolume: transactionVolumeScore,
      smartContractCalls: smartContractCallsScore,
      uniqueWallets: uniqueWalletsScore
    };

    this.log("📊 Pontuações on-chain calculadas:", {
      transactionVolume: `${transactionVolumeScore.toFixed(2)}/${this.maxPoints.transactionVolume}`,
      smartContractCalls: `${smartContractCallsScore.toFixed(2)}/${this.maxPoints.smartContractCalls}`,
      uniqueWallets: `${uniqueWalletsScore.toFixed(2)}/${this.maxPoints.uniqueWallets}`,
      total: `${totalScore.toFixed(2)}/${this.maxPoints.total}`
    });

    return {
      rawMetrics: metrics,
      scoreBreakdown,
      totalScore,
      metadata: {
        calculationTimestamp: Date.now(),
        thresholds: this.thresholds,
        maxPoints: this.maxPoints
      }
    };
  }

  /**
   * Validates on-chain metrics data
   */
  validateMetrics(metrics: OnchainMetrics): boolean {
    const requiredFields = [
      'transactionVolume',
      'contractInteractions', 
      'uniqueWallets',
      'transactionCount'
    ];

    for (const field of requiredFields) {
      if (!(field in metrics) || typeof metrics[field as keyof OnchainMetrics] !== 'number') {
        this.log(`❌ Validation failed: Missing or invalid field '${field}'`);
        return false;
      }
    }

    if (metrics.transactionVolume < 0 || 
        metrics.contractInteractions < 0 || 
        metrics.uniqueWallets < 0 || 
        metrics.transactionCount < 0) {
      this.log("❌ Validation failed: Negative values not allowed");
      return false;
    }

    return true;
  }
} 