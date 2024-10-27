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

export class NEARCollector extends BaseCollector {
  private readonly api: AxiosInstance;
  private readonly account: string;

  constructor(config: {
    account: string;
    logger: Logger;
    maxRequestsPerSecond?: number;
  }) {
    super({
      logger: config.logger,
      maxRequestsPerSecond: config.maxRequestsPerSecond || 5
    });

    this.account = config.account;
    this.api = axios.create({
      baseURL: process.env.NEAR_API_URL || 'https://api.nearblocks.io/v1',
      headers: {
        'Accept': 'application/json',
        'X-API-Key': process.env.NEAR_API_KEY
      },
      timeout: 10000
    });
  }

  async collectMetrics(): Promise<NEARMetrics> {
    try {
      const [txResponse, contractResponse, priceResponse] = await Promise.all([
        this.api.get(`/account/${this.account}/txns`),
        this.api.get(`/account/${this.account}/contract`),
        this.api.get('/stats/price')
      ]);

      if (!txResponse.data || !contractResponse.data || !priceResponse.data) {
        throw new Error('Invalid API response');
      }

      const txns = txResponse.data.txns || [];
      const contract = contractResponse.data.contract || {};
      const price = priceResponse.data.near?.usd || 0;
      const priceTimestamp = priceResponse.data.near?.timestamp || Date.now();

      return {
        timestamp: Date.now(),
        projectId: this.account,
        transactions: {
          count: parseInt(contract.transactions_count || '0'),
          volume: txResponse.data.total_amount || "0",
          uniqueUsers: Array.from(new Set(txns.map((tx: any) => tx.signer_account_id)))
        },
        contract: {
          calls: parseInt(contract.transactions_count || '0'),
          uniqueCallers: Array.from(new Set(txns.map((tx: any) => tx.signer_account_id)))
        },
        contractCalls: {
          count: parseInt(contract.transactions_count || '0'),
          uniqueCallers: Array.from(new Set(txns.map((tx: any) => tx.signer_account_id)))
        },
        metadata: {
          collectionTimestamp: Date.now(),
          source: 'near',
          projectId: this.account,
          periodStart: Date.now() - (7 * 24 * 60 * 60 * 1000),
          periodEnd: Date.now(),
          blockHeight: parseInt(contract.block_height || '0'),
          priceData: {
            usd: price,
            timestamp: priceTimestamp 
          }
        }
      };
    } catch (error) {
      this.logger.error('Failed to collect NEAR metrics', {
        error: formatError(error),
        context: { account: this.account }
      });
      throw new BaseError(
        'NEAR metrics collection failed',
        ErrorCode.NEAR_API_ERROR,
        { error: formatError(error) }
      );
    }
  }
}
