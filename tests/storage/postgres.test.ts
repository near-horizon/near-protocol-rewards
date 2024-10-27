import { Pool, PoolConfig, QueryResult, QueryResultRow, PoolClient } from 'pg';
import { PostgresStorage } from '../../src/storage/postgres';
import { createMockStoredMetrics } from '../helpers/mock-data';
import { Logger } from '../../src/utils/logger';
import { BaseError } from '../../src/utils/errors';

// Create a mock QueryResult with constraint
const createMockQueryResult = <T extends QueryResultRow = any>(): QueryResult<T> => ({
  rows: [] as T[],
  command: '',
  rowCount: 0,
  oid: 0,
  fields: []
});

// Mock pg module
jest.mock('pg', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  const mockPool = {
    connect: jest.fn().mockResolvedValue(mockClient),
    end: jest.fn().mockResolvedValue(undefined),
  };

  return { Pool: jest.fn(() => mockPool) };
});

describe('PostgresStorage', () => {
  let storage: PostgresStorage;
  let pool: Pool;
  let client: any;
  let logger: Logger;

  beforeEach(async () => {
    logger = new Logger({ projectId: 'test' });
    
    const poolConfig: PoolConfig = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'test_db',
      user: process.env.POSTGRES_USER || 'test_user',
      password: process.env.POSTGRES_PASSWORD || 'test_password'
    };

    pool = new Pool(poolConfig);
    client = await pool.connect();

    storage = new PostgresStorage({
      connectionConfig: poolConfig,
      logger
    });

    await storage.initialize();
  });

  afterEach(async () => {
    if (client) {
      client.release();
    }
    if (pool) {
      await pool.end();
    }
  });

  it('should store metrics successfully', async () => {
    const metrics = createMockStoredMetrics();
    
    // Setup successful transaction mock
    client.query
      .mockResolvedValueOnce(createMockQueryResult()) // BEGIN
      .mockResolvedValueOnce(createMockQueryResult()) // INSERT
      .mockResolvedValueOnce(createMockQueryResult()); // COMMIT

    await storage.saveMetrics('test-project', metrics);
    
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO metrics'),
      expect.any(Array)
    );
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('should handle transaction failures', async () => {
    const mockError = new Error('DB Error');
    const metrics = createMockStoredMetrics();
    
    // Setup failed transaction mock
    client.query
      .mockResolvedValueOnce(createMockQueryResult()) // BEGIN
      .mockRejectedValueOnce(mockError)              // INSERT fails
      .mockResolvedValueOnce(createMockQueryResult()); // ROLLBACK

    await expect(storage.saveMetrics('test-project', metrics))
      .rejects
      .toThrow('Failed to save metrics');

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });
});
