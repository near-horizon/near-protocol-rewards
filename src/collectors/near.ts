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
import { BaseCollector, BaseCollectorConfig } from './base';
import { NEARMetrics } from '../types';
import { Logger } from '../utils/logger';
import { BaseError, ErrorCode } from '../types/errors';
import { formatError } from '../utils/format-error';
import { JSONValue } from '../types/json';

export interface NEARCollectorConfig extends BaseCollectorConfig {
  account: string;
  apiKey?: string;
  apiUrl?: string;
}

// Add interfaces for API response types
interface NEARTransaction {
  hash: string;
  signer_account_id: string;
  amount?: string;
  block_timestamp?: number;
  block_height?: string;
}

interface NEARContractResponse {
  contract: {
    transactions_count: number;
    unique_callers_count: number;
    block_height?: string;
  };
}

interface NEARPriceResponse {
  near: {
    usd: number;
    timestamp: number;
  };
}

// Update the transaction response interface
interface NEARTransactionResponse {
  txns: NEARTransaction[];
  total_amount: string;
}

export class NEARCollector extends BaseCollector {
  private readonly api: AxiosInstance;
  private readonly account: string;

  constructor(config: NEARCollectorConfig) {
    super({
      logger: config.logger,
      maxRequestsPerSecond: config.maxRequestsPerSecond
    });

    this.account = config.account;
    this.api = axios.create({
      baseURL: config.apiUrl || process.env.NEAR_API_URL || 'https://api.nearblocks.io/v1',
      headers: {
        'Accept': 'application/json',
        'X-API-Key': config.apiKey || process.env.NEAR_API_KEY
      },
      timeout: 10000
    });
  }

  async collectMetrics(): Promise<NEARMetrics> {
    try {
      const [txResponse, contractResponse, priceResponse] = await Promise.all([
        this.api.get<NEARTransactionResponse>(`/account/${this.account}/txns`),
        this.api.get<NEARContractResponse>(`/account/${this.account}/contract`),
        this.api.get<NEARPriceResponse>('/stats/price')
      ]);

      const txns = txResponse.data.txns || [];
      const contract = contractResponse.data.contract || {};

      return {
        timestamp: Date.now(),
        projectId: this.account,
        transactions: {
          count: contract.transactions_count || 0,
          volume: txResponse.data.total_amount || '0',
          uniqueUsers: Array.from(new Set(txns.map((tx: NEARTransaction) => tx.signer_account_id)))
        },
        contract: {
          calls: contract.transactions_count || 0,
          uniqueCallers: Array.from(new Set(txns.map((tx: NEARTransaction) => tx.signer_account_id)))
        },
        contractCalls: {
          count: contract.transactions_count || 0,
          uniqueCallers: Array.from(new Set(txns.map((tx: NEARTransaction) => tx.signer_account_id)))
        },
        metadata: {
          collectionTimestamp: Date.now(),
          source: 'near',
          projectId: this.account,
          periodStart: Date.now() - (7 * 24 * 60 * 60 * 1000),
          periodEnd: Date.now(),
          blockHeight: parseInt(contract.block_height || '0'),
          priceData: {
            usd: priceResponse.data.near?.usd || 0,
            timestamp: priceResponse.data.near?.timestamp || Date.now()
          }
        }
      };
    } catch (error) {
      return this.handleError(error, 'collectMetrics');
    }
  }
}
