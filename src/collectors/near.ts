import axios, { AxiosInstance } from 'axios';
import { BaseCollector } from './base';
import { NEARMetrics } from '../types';
import { Logger } from '../utils/logger';
import { BaseError, ErrorCode } from '../utils/errors';

interface NEARCollectorConfig {
  account: string;
  token?: string;  // Optional API token
  logger: Logger;
  endpoint?: string;
}

interface NEARPrice {
  usd: number;
  timestamp: number;
}

export class NEARCollector extends BaseCollector {
  private readonly api: AxiosInstance;
  private readonly account: string;
  private lastKnownPrice: NEARPrice | null = null;

  constructor(config: NEARCollectorConfig) {
    // NEARBlocks API has a default rate limit of 30 requests per minute
    super(config.logger, 25, 60 * 1000);
    
    this.account = config.account;
    this.api = axios.create({
      baseURL: config.endpoint || 'https://api.nearblocks.io/v1',
      headers: {
        'Accept': 'application/json',
        ...(config.token && { 'Authorization': `Bearer ${config.token}` })
      }
    });
  }

  async collectMetrics(): Promise<NEARMetrics> {
    try {
      const [txns, ftTransfers, price] = await Promise.all([
        this.fetchTransactions(),
        this.fetchFTTransfers(),
        this.fetchNEARPrice()
      ]);

      const timestamp = Date.now();

      // Calculate total volume in USD
      const totalVolumeNEAR = this.calculateTotalVolume(txns);
      const volumeUSD = (totalVolumeNEAR * price.usd).toFixed(2);

      return {
        transactions: {
          count: txns.length,
          volume: volumeUSD,
          uniqueUsers: this.extractUniqueUsers(txns)
        },
        contract: {
          calls: ftTransfers.length,
          uniqueCallers: this.extractUniqueCalls(ftTransfers)
        },
        metadata: {
          collectionTimestamp: timestamp,
          source: 'near',
          projectId: this.account,
          periodStart: timestamp - (30 * 24 * 60 * 60 * 1000),
          periodEnd: timestamp,
          nearPrice: price
        }
      };
    } catch (error) {
      throw new BaseError(
        'Failed to collect NEAR metrics',
        ErrorCode.COLLECTION_ERROR,
        { error, account: this.account }
      );
    }
  }

  private async fetchTransactions(days = 30): Promise<any[]> {
    return this.withRetry(async () => {
      const response = await this.api.get(`/account/${this.account}/txns`, {
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
    }, 'Fetching NEAR transactions');
  }

  private async fetchFTTransfers(days = 30): Promise<any[]> {
    return this.withRetry(async () => {
      const response = await this.api.get(`/account/${this.account}/ft-transfers`, {
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
        () => this.api.get('/stats/price'),
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
      // If price fetch fails, use last known price or default
      if (this.lastKnownPrice) {
        this.logger.warn('Using last known NEAR price due to error', { error });
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
