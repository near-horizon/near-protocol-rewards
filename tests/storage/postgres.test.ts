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

// Create a complete mock client type
type MockClient = {
  [K in keyof PoolClient]: K extends 'query' | 'release' | 'on' 
    ? jest.Mock 
    : PoolClient[K];
};

// Create mock client factory with all required properties
const createMockClient = (): MockClient => {
  const client = {
    query: jest.fn().mockResolvedValue(createMockQueryResult()),
    release: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
    off: jest.fn(),
    connect: jest.fn(),
    copyFrom: jest.fn(),
    copyTo: jest.fn(),
    pauseDrain: jest.fn(),
    resumeDrain: jest.fn(),
    escapeIdentifier: jest.fn(),
    escapeLiteral: jest.fn(),
    cancel: jest.fn(),
    addListener: jest.fn(),
    emit: jest.fn(),
    eventNames: jest.fn(),
    getMaxListeners: jest.fn(),
    listenerCount: jest.fn(),
    listeners: jest.fn(),
    once: jest.fn(),
    prependListener: jest.fn(),
    prependOnceListener: jest.fn(),
    rawListeners: jest.fn(),
    removeAllListeners: jest.fn(),
    setMaxListeners: jest.fn(),
    connection: {},
    processID: 0,
    secretKey: 0,
    ssl: false,
    database: 'test_db',
    user: 'test_user',
    password: 'test_password',
    port: 5432,
    host: 'localhost'
  } as const;

  return client as unknown as MockClient;
};

// Mock pg with proper types and client
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn().mockResolvedValue(createMockQueryResult()),
    connect: jest.fn().mockImplementation(() => Promise.resolve(createMockClient())),
    end: jest.fn().mockResolvedValue(undefined),
    on: jest.fn()
  };

  return { 
    Pool: jest.fn(() => mPool),
    createMockClient
  };
});

describe('PostgresStorage', () => {
  let storage: PostgresStorage;
  let pool: jest.Mocked<Pool>;
  let logger: Logger;
  let mockClient: MockClient;

  beforeEach(async () => {
    logger = new Logger({ projectId: 'test' });
    
    const poolConfig: PoolConfig = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'test_db',
      user: process.env.POSTGRES_USER || 'test_user',
      password: process.env.POSTGRES_PASSWORD || 'test_password'
    };

    const pg = jest.requireMock('pg');
    mockClient = pg.createMockClient();
    pool = new Pool() as jest.Mocked<Pool>;
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);

    storage = new PostgresStorage({
      connectionConfig: poolConfig,
      logger
    });
    
    await storage.initialize();
  });

  afterEach(async () => {
    try {
      await storage.cleanup();
    } catch (error) {
      // Ignore cleanup errors in tests
      console.warn('Cleanup warning:', error);
    }
  });

  it('should store metrics successfully', async () => {
    const metrics = createMockStoredMetrics();
    
    // Setup mock responses
    jest.spyOn(mockClient, 'query')
      .mockResolvedValueOnce(createMockQueryResult()) // BEGIN
      .mockResolvedValueOnce(createMockQueryResult()) // INSERT
      .mockResolvedValueOnce(createMockQueryResult()); // COMMIT

    await storage.saveMetrics('test-project', metrics);
    
    expect(mockClient.query).toHaveBeenCalledTimes(3);
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should handle transaction failures', async () => {
    const mockError = new Error('DB Error');
    
    // Setup mock responses
    jest.spyOn(mockClient, 'query')
      .mockResolvedValueOnce(createMockQueryResult()) // BEGIN
      .mockRejectedValueOnce(mockError) // INSERT fails
      .mockResolvedValueOnce(createMockQueryResult()); // ROLLBACK

    const projectId = 'test-project';
    const metrics = createMockStoredMetrics();

    await expect(storage.saveMetrics(projectId, metrics))
      .rejects
      .toThrow('Failed to save metrics');

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });
});
