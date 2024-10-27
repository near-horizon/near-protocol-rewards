import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import { PostgresStorage } from '../../src/storage/postgres';
import { createMockStoredMetrics } from '../helpers/mock-data';
import { Logger } from '../../src/utils/logger';

// Create a mock QueryResult with constraint
const createMockQueryResult = <T extends QueryResultRow = any>(): QueryResult<T> => ({
  rows: [] as T[],
  command: '',
  rowCount: 0,
  oid: 0,
  fields: []
});

// Mock pg with proper types
jest.mock('pg', () => {
  const mockClient = {
    query: jest.fn().mockResolvedValue(createMockQueryResult()),
    release: jest.fn()
  };

  const mPool = {
    query: jest.fn().mockResolvedValue(createMockQueryResult()),
    connect: jest.fn().mockResolvedValue(mockClient),
    end: jest.fn()
  };

  return { Pool: jest.fn(() => mPool) };
});

describe('PostgresStorage', () => {
  let storage: PostgresStorage;
  let pool: jest.Mocked<Pool>;
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

    pool = new Pool() as jest.Mocked<Pool>;
    storage = new PostgresStorage({
      connectionConfig: poolConfig,
      logger
    });
    
    await storage.initialize();
  });

  afterEach(async () => {
    await storage.cleanup();
  });

  it('should store metrics successfully', async () => {
    const metrics = createMockStoredMetrics();
    await storage.saveMetrics('test-project', metrics);
    expect(pool.query).toHaveBeenCalled();
  });

  it('should handle transaction failures', async () => {
    const mockError = new Error('DB Error');
    pool.query.mockRejectedValueOnce(mockError as never);

    const projectId = 'test-project';
    const metrics = createMockStoredMetrics();

    await expect(storage.saveMetrics(projectId, metrics))
      .rejects
      .toThrow('Failed to save metrics');
  });
});
