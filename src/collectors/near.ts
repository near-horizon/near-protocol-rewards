import axios, { AxiosInstance } from 'axios';
import { NEARMetrics, NEARMetricsMetadata, ContractMetrics } from '../types';
import { Logger } from '../utils/logger';
import { APIError, CollectionError, SDKError, ErrorCode } from '../utils/errors';

interface NEARCollectorConfig {
  account: string;
  endpoint?: string;
  logger: Logger;
}

export class NEARCollector {
  private readonly api: AxiosInstance;
  private readonly logger: Logger;
  private readonly account: string;

  constructor(config: NEARCollectorConfig) {
    this.logger = config.logger;
    this.account = config.account;

    this.api = axios.create({
      baseURL: config.endpoint || 'https://api.nearblocks.io/v1',
      headers: {
        'Accept': 'application/json'
      }
    });
  }

  async collectMetrics(): Promise<NEARMetrics> {
    try {
      const [txns, contractCalls] = await Promise.all([
        this.fetchTransactions(),
        this.fetchContractCalls()
      ]);

      const timestamp = Date.now();
      const blockHeight = await this.fetchLatestBlockHeight();

      return {
        transactions: {
          count: txns.length,
          volume: this.calculateTotalVolume(txns),
          uniqueUsers: this.extractUniqueUsers(txns),
          timestamp
        },
        contract: {
          calls: contractCalls.length,
          uniqueCallers: this.extractUniqueCalls(contractCalls),
          timestamp
        },
        metadata: {
          collectionTimestamp: timestamp,
          blockHeight
        }
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new APIError(
          'NEAR API request failed',
          error.response?.status || 500,
          {
            message: error.message,
            account: this.account
          }
        );
      }
      throw new CollectionError('Failed to collect NEAR metrics', {
        account: this.account,
        error
      });
    }
  }

  private async fetchTransactions(days = 30): Promise<any[]> {
    const { data } = await this.api.get(`/account/${this.account}/txns`, {
      params: {
        limit: 100,
        order: 'desc'
      }
    });
    
    if (!data.txns) {
      throw new CollectionError('Invalid transaction data format', {
        account: this.account
      });
    }

    return data.txns;
  }

  private async fetchContractCalls(days = 30): Promise<any[]> {
    const { data } = await this.api.get(`/contract/${this.account}/txns`, {
      params: {
        limit: 100,
        order: 'desc'
      }
    });

    if (!data.txns) {
      throw new CollectionError('Invalid contract calls data format', {
        account: this.account
      });
    }

    return data.txns;
  }

  private async fetchLatestBlockHeight(): Promise<number> {
    const { data } = await this.api.get('/status');
    return data.status.sync_info.latest_block_height;
  }

  private calculateTotalVolume(txns: any[]): string {
    const total = txns.reduce((sum, txn) => {
      const amount = parseFloat(txn.amount_deposited || '0');
      return sum + amount;
    }, 0);
    return total.toString();
  }

  private extractUniqueUsers(txns: any[]): string[] {
    return [...new Set(txns.map(txn => 
      txn.signer_account_id || txn.receiver_account_id
    ))];
  }

  private extractUniqueCalls(calls: any[]): string[] {
    return [...new Set(calls.map(call => 
      call.signer_account_id
    ))];
  }

  private validateMetadata(metadata: NEARMetricsMetadata): void {
    if (!metadata.account) {
      throw new SDKError(
        ErrorCode.VALIDATION_ERROR,
        'Missing account in NEAR metrics metadata'
      );
    }
    
    if (!metadata.collectionTimestamp) {
      throw new SDKError(
        ErrorCode.VALIDATION_ERROR, 
        'Missing collection timestamp'
      );
    }
  }

  private async fetchContractMetrics(account: string): Promise<ContractMetrics> {
    try {
      const response = await this.api.get(`/contract/${account}/metrics`);
      return this.validateContractResponse(response.data);
    } catch (error) {
      throw new SDKError(
        ErrorCode.API_ERROR,
        'Failed to fetch contract metrics',
        { account, error }
      );
    }
  }
}
