import { Pool, QueryResult } from 'pg';
import { NearWalletCollector } from '../../../src/collectors/near-wallet-collector';

interface MockRow {
  block_timestamp: string;
  transaction_hash: string;
  signer_account_id: string;
  receiver_account_id: string;
  action_kind: string;
  args: { amount: string };
}

jest.mock('pg', () => {
  return {
    Pool: jest.fn().mockImplementation(() => ({
      query: jest.fn(),
      end: jest.fn(),
    })),
  };
});

describe('NearWalletCollector', () => {
  let collector: NearWalletCollector;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    process.env.MAINNET_DB_CONNECTION_STRING = 'test-connection-string';
    mockPool = new Pool() as jest.Mocked<Pool>;
    collector = new NearWalletCollector('test-wallet');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error when connection string is not found', () => {
    delete process.env.MAINNET_DB_CONNECTION_STRING;
    expect(() => new NearWalletCollector('test-wallet', 'testnet')).toThrow(
      'Database connection string not found for network testnet'
    );
  });

  it('should collect activities successfully', async () => {
    const mockRows: MockRow[] = [
      {
        block_timestamp: '1000000000000',
        transaction_hash: 'hash1',
        signer_account_id: 'test-wallet',
        receiver_account_id: 'other-wallet',
        action_kind: 'transfer',
        args: { amount: '100' },
      },
    ];

    const mockQueryResult = {
      rows: mockRows,
      command: '',
      rowCount: 1,
      fields: [],
      oid: 0,
    } as QueryResult<MockRow>;

    (mockPool.query as jest.Mock).mockResolvedValueOnce(mockQueryResult);

    const activities = await collector.collectActivities();

    expect(activities).toHaveLength(1);
    expect(activities[0]).toEqual({
      timestamp: 1000,
      transactionHash: 'hash1',
      type: 'outgoing',
      details: {
        signerId: 'test-wallet',
        receiverId: 'other-wallet',
        actions: [
          {
            kind: 'transfer',
            args: { amount: '100' },
          },
        ],
      },
    });
    expect(mockPool.query).toHaveBeenCalled();
    expect(mockPool.end).toHaveBeenCalled();
  });

  it('should handle errors during activity collection', async () => {
    (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const activities = await collector.collectActivities();

    expect(activities).toEqual([]);
    expect(mockPool.end).toHaveBeenCalled();
  });
}); 