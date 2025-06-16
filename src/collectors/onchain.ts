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
   * Fetches transaction data for the account from NearBlocks API using txns-only endpoint
   */
  async fetchTransactionData(year: number, month: number): Promise<NearTransactionData> {
    const { startDate, endDate } = this.getDateRange(year, month);
    
    this.log(`🔍 Fetching transactions for account: ${this.accountId}`);
    this.log(`📅 Period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    const allTransactions: NearTransaction[] = [];
    let cursor: string | null = null;
    const limit = 100;
    let requestCount = 0;

    while (true) {
      this.log(`🌐 Requesting data (request ${++requestCount})`);
      
      try {
        const response = await this.withRateLimit(async () => {
          // Build URL with cursor-based pagination
          let url = `${this.baseUrl}/account/${this.accountId}/txns-only?per_page=${limit}`;
          if (cursor) {
            url += `&cursor=${cursor}`;
          }
          
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
        cursor = data.cursor || null;
        
        // Filter transactions by timestamp since API doesn't support timestamp filtering
        const filteredTransactions = transactions.filter((tx: NearTransaction) => {
          const txTimestamp = parseInt(tx.block_timestamp) / 1e6; // Convert nanoseconds to milliseconds
          const txDate = new Date(txTimestamp);
          return txDate >= startDate && txDate <= endDate;
        });
        
        this.log(`📄 Found ${transactions.length} transactions, ${filteredTransactions.length} in date range`);
        
        if (filteredTransactions.length === 0 && transactions.length > 0) {
          // If we have transactions but none in our date range, and they're newer than our end date, we can stop
          for (const tx of transactions) {
            const txTimestamp = parseInt(tx.block_timestamp) / 1e6;
            const txDate = new Date(txTimestamp);
            if (txDate < startDate) {
              // We've gone too far back, stop here
              this.log("📅 Reached transactions older than target period, stopping");
              cursor = null;
              break;
            }
          }
        }
        
        allTransactions.push(...filteredTransactions);
        
        // Break if no more cursor or no transactions
        if (!cursor || transactions.length === 0) {
          break;
        }
        
        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        this.error(`❌ Error in request: ${error}`);
        throw error;
      }
    }

    this.log(`✅ Total transactions found in period: ${allTransactions.length}`);

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