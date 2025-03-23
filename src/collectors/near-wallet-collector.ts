import { Pool } from 'pg';

export interface WalletActivity {
  timestamp: number;
  transactionHash: string;
  type: 'incoming' | 'outgoing';
  details: {
    signerId: string;
    receiverId: string;
    actions: any[];
  };
}

export class NearWalletCollector {
  private walletId: string;
  private pool: Pool;

  constructor(walletId: string, networkId: string = 'mainnet') {
    this.walletId = walletId;
    
    const connectionString = networkId === 'mainnet' 
      ? process.env.MAINNET_DB_CONNECTION_STRING
      : process.env.TESTNET_DB_CONNECTION_STRING;

    if (!connectionString) {
      throw new Error(`Database connection string not found for network ${networkId}`);
    }

    this.pool = new Pool({ connectionString });
  }

  async collectActivities(): Promise<WalletActivity[]> {
    const activities: WalletActivity[] = [];

    try {
      const query = `
        SELECT 
          t.block_timestamp,
          t.transaction_hash,
          t.signer_account_id,
          t.receiver_account_id,
          ta.action_kind,
          ta.args
        FROM transactions t
        LEFT JOIN transaction_actions ta ON t.transaction_hash = ta.transaction_hash
        WHERE 
          (t.signer_account_id = $1 OR t.receiver_account_id = $1)
          AND t.block_timestamp >= EXTRACT(EPOCH FROM date_trunc('month', CURRENT_DATE)) * 1000000000
          AND t.block_timestamp <= EXTRACT(EPOCH FROM date_trunc('month', CURRENT_DATE + INTERVAL '1 month')) * 1000000000
        ORDER BY t.block_timestamp DESC
      `;

      const result = await this.pool.query(query, [
        this.walletId
      ]);

      for (const row of result.rows) {
        activities.push({
          timestamp: Number(row.block_timestamp) / 1000000000,
          transactionHash: row.transaction_hash,
          type: row.signer_account_id === this.walletId ? 'outgoing' : 'incoming',
          details: {
            signerId: row.signer_account_id,
            receiverId: row.receiver_account_id,
            actions: [{
              kind: row.action_kind,
              args: row.args
            }]
          },
        });
      }

    } catch (error) {
      console.error('Error collecting wallet activities:', error);
    } finally {
      await this.pool.end();
    }

    return activities;
  }

  private formatTimestamp(timestamp: string | number): number {
    return Number(timestamp) / 1000000000; 
  }
} 