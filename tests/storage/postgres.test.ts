import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import { PostgresStorage } from '../../src/storage/postgres';
import { createMockStoredMetrics } from '../helpers/mock-data';
import { Logger } from '../../src/utils/logger';

// Create a mock QueryResult
const createMockQueryResult = <T extends QueryResultRow = any>(): QueryResult<T> => ({
  rows: [] as T[],
  command: '',
  rowCount: 0,
  oid: 0,
  fields: []
});

// Create mock client type
interface MockClient {
  query: jest.Mock;
  release: jest.Mock;
}

// Mock pg module
jest.mock('pg', () => {
  // Create mock client with proper Jest functions
  const mockClient: MockClient = {
    query: jest.fn(),
    release: jest.fn()
  };

  const mockPool = {
    connect: jest.fn().mockResolvedValue(mockClient),
    query: jest.fn(),
    end: jest.fn()
  };

  return { 
    Pool: jest.fn(() => mockPool)
  };
});

describe('PostgresStorage', () => {
  let storage: PostgresStorage;
  let logger: Logger;
  let mockClient: MockClient;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    logger = new Logger({ projectId: 'test' });
    
    const poolConfig: PoolConfig = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'test_db',
      user: process.env.POSTGRES_USER || 'test_user',
      password: process.env.POSTGRES_PASSWORD || 'test_password'
    };

    // Setup pool and client
    const pg = jest.requireMock('pg');
    const pool = new pg.Pool();
    mockClient = {
      query: jest.fn().mockResolvedValue(createMockQueryResult()),
      release: jest.fn()
    };
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);

    storage = new PostgresStorage({
      connectionConfig: poolConfig,
      logger
    });
  });

  afterEach(async () => {
    if (storage) {
      await storage.cleanup();
    }
  });

  it('should store metrics successfully', async () => {
    const metrics = createMockStoredMetrics();
    
    mockClient.query
      .mockResolvedValueOnce(createMockQueryResult()) // BEGIN
      .mockResolvedValueOnce(createMockQueryResult()) // INSERT
      .mockResolvedValueOnce(createMockQueryResult()); // COMMIT

    await storage.saveMetrics('test-project', metrics);

    const calls = mockClient.query.mock.calls;
    expect(calls[0][0]).toBe('BEGIN');
    expect(calls[1][0]).toContain('INSERT INTO metrics');
    expect(calls[2][0]).toBe('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should handle transaction failures', async () => {
    const mockError = new Error('DB Error');
    const metrics = createMockStoredMetrics();

    // Important: Set up the mock implementation for the entire sequence
    let queryCount = 0;
    mockClient.query.mockImplementation(() => {
      queryCount++;
      if (queryCount === 1) return Promise.resolve(createMockQueryResult()); // BEGIN
      if (queryCount === 2) return Promise.reject(mockError);               // INSERT fails
      if (queryCount === 3) return Promise.resolve(createMockQueryResult()); // ROLLBACK
      return Promise.resolve(createMockQueryResult());
    });

    await expect(storage.saveMetrics('test-project', metrics))
      .rejects
      .toThrow('Failed to save metrics');

    const calls = mockClient.query.mock.calls;
    expect(calls[0][0]).toBe('BEGIN');
    expect(calls[1][0]).toContain('INSERT INTO metrics');
    expect(calls[2][0]).toBe('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should initialize database tables', async () => {
    // Setup the mock implementation
    const pg = jest.requireMock('pg');
    const pool = new pg.Pool();
    
    // Create a fresh mock for this test
    const testMockClient = {
      query: jest.fn().mockImplementation((query) => {
        if (typeof query === 'string' && query.includes('CREATE TABLE IF NOT EXISTS metrics')) {
          return Promise.resolve(createMockQueryResult());
        }
        return Promise.resolve(createMockQueryResult());
      }),
      release: jest.fn()
    };
    
    // Set up the pool mock for this test
    (pool.connect as jest.Mock).mockResolvedValue(testMockClient);
    
    // Mock the pool query method specifically for initialization
    (pool as any).query = jest.fn().mockImplementation((query) => {
      if (typeof query === 'string' && query.includes('CREATE TABLE IF NOT EXISTS metrics')) {
        return Promise.resolve(createMockQueryResult());
      }
      return Promise.resolve(createMockQueryResult());
    });
    
    // Create a new storage instance for this test
    const testStorage = new PostgresStorage({
      connectionConfig: {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
      },
      logger
    });

    // Call initialize
    await testStorage.initialize();
    
    // Verify the initialization query was called
    expect((pool as any).query).toHaveBeenCalled();
    
    // Get the calls
    const calls = (pool as any).query.mock.calls;
    
    // Verify the CREATE TABLE query
    const createTableQuery = calls[0][0];
    expect(createTableQuery).toContain('CREATE TABLE IF NOT EXISTS metrics');
    expect(createTableQuery).toContain('project_id VARCHAR(255)');
  });

  it('should cleanup resources properly', async () => {
    await storage.cleanup();
    
    const pg = jest.requireMock('pg');
    const mockPool = new pg.Pool();
    expect(mockPool.end).toHaveBeenCalled();
  });
});