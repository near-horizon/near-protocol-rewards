/**
 * NEAR On-chain Metrics Collector
 *
 * Collects on-chain metrics from NEAR blockchain including:
 * - Transaction volume
 * - Contract interactions
 * - Unique wallets
 * - Transaction count
 *
 * Features built-in rate limiting and error handling for API calls.
 */

import { BaseCollector } from "./base";
import { Logger } from "../utils/logger";
import { RateLimiter } from "../utils/rate-limiter";
import { OnchainMetrics, NearTransactionData, NearTransaction } from "../types/metrics";
import { BaseError, ErrorCode } from "../types/errors";

interface OnchainCollectorConfig {
  apiKey: string;
  accountId: string;
  logger?: Logger;
  rateLimiter?: RateLimiter;
}

export class OnchainCollector extends BaseCollector {
  private readonly apiKey: string;
  private readonly accountId: string;
  private readonly baseUrl = "https://api.nearblocks.io/v1";

  /**
   * Creates a new NEAR on-chain collector
   * 
   * @param config Configuration object with API key and account ID
   */
  constructor(config: OnchainCollectorConfig) {
    super(config.logger, config.rateLimiter);
    
    this.apiKey = config.apiKey;
    this.accountId = config.accountId;
  }

  /**
   * Tests the connection to NearBlocks API
   */
  async testConnection(): Promise<void> {
    try {
      this.log("Testing NearBlocks API connection");
      
      await this.withRateLimit(async () => {
        const response = await fetch(`${this.baseUrl}/account/${this.accountId}`, {
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Accept": "application/json"
          }
        });

        if (response.status === 404) {
          throw new BaseError(
            `Account not found: ${this.accountId}`,
            ErrorCode.NOT_FOUND
          );
        }

        if (!response.ok) {
          throw new BaseError(
            `API request failed: ${response.status} ${response.statusText}`,
            ErrorCode.NETWORK_ERROR
          );
        }
      });
      
      this.log("NearBlocks API connection successful");
    } catch (error) {
      this.error("Failed to connect to NearBlocks API", { error });
      throw error;
    }
  }

  /**
   * Gets the date range for the specified year and month
   */
  private getDateRange(year: number, month: number): { startDate: Date; endDate: Date } {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    return { startDate, endDate };
  }

  /**
   * Converts date to nanosecond timestamp for NEAR API
   */
  private dateToNanoseconds(date: Date): number {
    return Math.floor(date.getTime() * 1e6);
  }

  /**
   * Fetches transaction data for the account from NearBlocks API
   */
  async fetchTransactionData(year: number, month: number): Promise<NearTransactionData> {
    const { startDate, endDate } = this.getDateRange(year, month);
    
    this.log(`🔍 Fetching transactions for account: ${this.accountId}`);
    this.log(`📅 Period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    const startTimestamp = this.dateToNanoseconds(startDate);
    const endTimestamp = this.dateToNanoseconds(endDate);
    
    const allTransactions: NearTransaction[] = [];
    let page = 1;
    const limit = 100;

    while (true) {
      this.log(`🌐 Requesting page ${page}`);
      
      try {
        const response = await this.withRateLimit(async () => {
          const url = `${this.baseUrl}/account/${this.accountId}/txns?page=${page}&per_page=${limit}&from_timestamp=${startTimestamp}&to_timestamp=${endTimestamp}`;
          
          const response = await fetch(url, {
            headers: {
              "Authorization": `Bearer ${this.apiKey}`,
              "Accept": "application/json"
            }
          });

          if (response.status === 404) {
            this.log(`⚠️ Account not found: ${this.accountId}`);
            return null;
          }

          if (response.status === 429) {
            this.error("❌ NearBlocks API rate limit exceeded");
            throw new BaseError(
              "NearBlocks API rate limit exceeded",
              ErrorCode.RATE_LIMIT_EXCEEDED
            );
          }

          if (response.status === 403) {
            throw new BaseError(
              "Access forbidden. Check your API key.",
              ErrorCode.FORBIDDEN
            );
          }

          if (!response.ok) {
            throw new BaseError(
              `API request failed: ${response.status} ${response.statusText}`,
              ErrorCode.NETWORK_ERROR
            );
          }

          return response;
        });

        if (!response) {
          break;
        }

        const data = await response.json();
        const transactions = data.txns || [];
        
        this.log(`📄 Found ${transactions.length} transactions on page ${page}`);
        
        if (transactions.length === 0) {
          break;
        }
        
        allTransactions.push(...transactions);
        
        if (transactions.length < limit) {
          break;
        }
        
        page++;
        
        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        this.error(`❌ Error in request: ${error}`);
        throw error;
      }
    }

    this.log(`✅ Total transactions found: ${allTransactions.length}`);

    return {
      metadata: {
        period: {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        },
        account_id: this.accountId,
        timestamp: new Date().toISOString()
      },
      transactions: allTransactions
    };
  }

  /**
   * Calculates on-chain metrics from transaction data
   */
  calculateOnchainMetrics(transactionData: NearTransactionData): OnchainMetrics {
    let totalVolume = 0;
    let contractInteractions = 0;
    const uniqueWallets = new Set<string>();
    
    for (const tx of transactionData.transactions) {
      // Volume calculation
      if (tx.actions_agg?.deposit) {
        totalVolume += parseFloat(tx.actions_agg.deposit);
      } else if (tx.actions) {
        for (const action of tx.actions) {
          if (action.deposit) {
            totalVolume += parseFloat(action.deposit);
          }
        }
      }
      
      // Contract interactions count
      if (tx.actions) {
        for (const action of tx.actions) {
          if (action.action === "FUNCTION_CALL") {
            contractInteractions++;
          }
        }
      }
      
      // Unique wallets
      const accountId = transactionData.metadata.account_id;
      if (tx.predecessor_account_id && tx.predecessor_account_id !== accountId) {
        uniqueWallets.add(tx.predecessor_account_id);
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
        projectId: this.accountId
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
   * Collects all on-chain metrics for the specified period
   */
  async collectMetrics(year: number, month: number): Promise<OnchainMetrics> {
    try {
      this.log(`🚀 Starting on-chain data collection for ${month}/${year}`);
      
      // Fetch transaction data
      const transactionData = await this.fetchTransactionData(year, month);
      
      // Calculate metrics
      const metrics = this.calculateOnchainMetrics(transactionData);
      
      this.log("✅ On-chain data collection completed successfully");
      
      return metrics;
    } catch (error) {
      this.error("❌ Error in on-chain data collection", { error });
      throw error;
    }
  }
} 