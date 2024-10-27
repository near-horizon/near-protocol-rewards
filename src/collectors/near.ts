/**
 * NEAR Blockchain Metrics Collector
 * 
 * Collects on-chain metrics from NEAR Protocol including:
 * - Transaction data
 * - Contract interactions
 * - User activity
 * 
 * Features built-in rate limiting and error handling for API calls.
 * Uses exponential backoff for retries on transient failures.
 * 
 * @example
 * ```typescript
 * const collector = new NEARCollector({
 *   account: 'project.near',
 *   logger: logger
 * });
 * const metrics = await collector.collectMetrics();
 * ```
 */

import axios, { AxiosInstance } from 'axios';
import { BaseCollector } from './base';
import { NEARMetrics } from '../types';
import { Logger } from '../utils/logger';
import { BaseError, ErrorCode } from '../utils/errors';
import { formatError } from '../utils/format-error';
import { ErrorDetail, JSONValue } from '../types/common';

interface NEARCollectorConfig {
  account: string;
  token?: string;  
  logger: Logger;
  endpoint?: string;
  maxRequestsPerSecond?: number;  // Add this
}

interface NEARPrice {
  usd: number;
  timestamp: number;
}

// Convert NEARPrice to a JSONValue compatible type
interface NEARPriceLog {
  usd: number;
  timestamp: number;
  [key: string]: JSONValue;
}

// Add response type definitions
interface NEARTransactionResponse {
  txns: {
    hash: string;
    signer_id: string;
    receiver_id: string;
    amount: string;
    block_timestamp: number;
  }[];
}

interface NEARFTTransferResponse {
  transfers: {
    token_id: string;
    from: string;
    to: string;
    amount: string;
    timestamp: number;
  }[];
}

interface NEARPriceResponse {
  price: {
    near: {
      usd: number;
      last_updated_at: number;
    };
  };
}

export class NEARCollector extends BaseCollector {
  private readonly api: AxiosInstance;
  private readonly account: string;
  private lastKnownPrice: NEARPrice | null = null;

  constructor(config: NEARCollectorConfig) {
    super({
      logger: config.logger,
      maxRequestsPerSecond: 5  // NEARBlocks rate limit
    });
    
    this.account = config.account;
    this.api = axios.create({
      baseURL: 'https://api.nearblocks.io/v1',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${config.token}`
      },
      timeout: 10000
    });
  }

  async collectMetrics(): Promise<NEARMetrics> {
    try {
      const timestamp = Date.now();
      const [txns, ftTransfers, price] = await Promise.all([
        this.fetchTransactions(),
        this.fetchFTTransfers(),
        this.fetchNEARPrice()
      ]);

      const totalVolumeNEAR = this.calculateTotalVolume(txns);
      const volumeUSD = (totalVolumeNEAR * price.usd).toFixed(2);

      return {
        timestamp,
        projectId: this.account,
        transactions: {
          count: txns.length,
          volume: volumeUSD,
          uniqueUsers: this.extractUniqueUsers(txns)
        },
        contract: {
          calls: ftTransfers.length,
          uniqueCallers: this.extractUniqueCalls(ftTransfers)
        },
        contractCalls: {
          count: ftTransfers.length,
          uniqueCallers: this.extractUniqueCalls(ftTransfers)
        },
        metadata: {
          collectionTimestamp: timestamp,
          source: 'near',
          projectId: this.account,
          periodStart: timestamp - (30 * 24 * 60 * 60 * 1000),
          periodEnd: timestamp,
          priceData: price
        }
      };
    } catch (error) {
      this.logger.error('Failed to collect NEAR metrics', {
        error: formatError(error),
        context: {
          account: this.account
        }
      });
      throw new BaseError(
        'NEAR metrics collection failed',
        ErrorCode.NEAR_API_ERROR,
        { error: formatError(error) }
      );
    }
  }

  private async fetchTransactions(): Promise<any[]> {
    return this.withRetry(async () => {
      try {
        const response = await this.api.get<NEARTransactionResponse>(`/account/${this.account}/txns`, {
          params: {
            limit: 100,
            order: 'desc'
          }
        });

        if (!response.data?.txns) {
          throw new BaseError(
            'Invalid transaction data format',
            ErrorCode.API_ERROR,
            { account: this.account }
          );
        }

        return response.data.txns;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 429) {
            throw new BaseError(
              'Rate limit exceeded',
              ErrorCode.RATE_LIMIT,
              { account: this.account }
            );
          }
          if (error.response?.status === 404) {
            throw new BaseError(
              'Account not found',
              ErrorCode.NOT_FOUND,
              { account: this.account }
            );
          }
        }
        throw error;
      }
    }, 'Fetching NEAR transactions');
  }

  private async fetchFTTransfers(): Promise<any[]> {
    return this.withRetry(async () => {
      try {
        const response = await this.api.get<NEARFTTransferResponse>(`/account/${this.account}/ft-transfers`, {
          params: {
            limit: 100,
            order: 'desc'
          }
        });

        if (!response.data?.transfers) {
          throw new BaseError(
            'Invalid FT transfers data format',
            ErrorCode.API_ERROR,
            { account: this.account }
          );
        }

        return response.data.transfers;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 429) {
            throw new BaseError(
              'Rate limit exceeded',
              ErrorCode.RATE_LIMIT,
              { account: this.account }
            );
          }
        }
        throw error;
      }
    }, 'Fetching FT transfers');
  }

  private async fetchNEARPrice(): Promise<NEARPrice> {
    try {
      // Check if we have a recent price (less than 5 minutes old)
      if (
        this.lastKnownPrice && 
        Date.now() - this.lastKnownPrice.timestamp < 5 * 60 * 1000
      ) {
        return this.lastKnownPrice;
      }

      const response = await this.withRetry(
        async () => {
          try {
            const res = await this.api.get<NEARPriceResponse>('/stats/price');
            return res;
          } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 429) {
              throw new BaseError(
                'Rate limit exceeded for price API',
                ErrorCode.RATE_LIMIT
              );
            }
            throw error;
          }
        },
        'Fetching NEAR price'
      );

      if (!response.data?.price?.near?.usd) {
        throw new BaseError(
          'Invalid price data format',
          ErrorCode.API_ERROR
        );
      }

      this.lastKnownPrice = {
        usd: response.data.price.near.usd,
        timestamp: Date.now()
      };

      return this.lastKnownPrice;
    } catch (error) {
      if (this.lastKnownPrice) {
        // Convert NEARPrice to JSONValue compatible format
        const priceLog: NEARPriceLog = {
          usd: this.lastKnownPrice.usd,
          timestamp: this.lastKnownPrice.timestamp
        };

        this.logger.warn('Using last known NEAR price', {
          error: formatError(error),
          context: {
            lastKnownPrice: priceLog,
            account: this.account
          }
        });
        return this.lastKnownPrice;
      }
      throw error;
    }
  }

  private calculateTotalVolume(txns: any[]): number {
    return txns.reduce((sum, txn) => {
      const amount = parseFloat(txn.amount_deposited || '0');
      return sum + amount;
    }, 0);
  }

  private extractUniqueUsers(txns: any[]): string[] {
    const users = new Set<string>();
    txns.forEach(txn => {
      if (txn.signer_account_id) users.add(txn.signer_account_id);
      if (txn.receiver_account_id) users.add(txn.receiver_account_id);
    });
    return Array.from(users);
  }

  private extractUniqueCalls(transfers: any[]): string[] {
    return [...new Set(transfers.map(t => t.signer_account_id))];
  }

  // Helper method to get latest NEAR price for reward calculations
  async getNEARPrice(): Promise<number> {
    const price = await this.fetchNEARPrice();
    return price.usd;
  }
}
