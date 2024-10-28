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
  let pool: Pool;
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
    pool = new pg.Pool();
    mockClient = {
      query: jest.fn().mockResolvedValue(createMockQueryResult()),
      release: jest.fn()
    };
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);

    storage = new PostgresStorage({
      connectionConfig: poolConfig,
      logger
    });

    await storage.initialize();
  });

  afterEach(async () => {
    if (storage) {
      await storage.cleanup();
    }
  });

  it('should store metrics successfully', async () => {
    const metrics = createMockStoredMetrics();
    
    // Setup successful transaction sequence
    const queryMock = mockClient.query as jest.Mock;
    queryMock
      .mockResolvedValueOnce(createMockQueryResult()) // BEGIN
      .mockResolvedValueOnce(createMockQueryResult()) // INSERT
      .mockResolvedValueOnce(createMockQueryResult()); // COMMIT

    await storage.saveMetrics('test-project', metrics);

    // Verify transaction sequence
    const calls = queryMock.mock.calls;
    expect(calls[0][0]).toBe('BEGIN');
    expect(calls[1][0]).toContain('INSERT INTO metrics');
    
    // Handle each parameter individually with proper parsing
    // Project ID
    expect(calls[1][1][0]).toBe('test-project');
    
    // Timestamps
    expect(calls[1][1][1]).toBe(metrics.timestamp);
    expect(calls[1][1][2]).toBe(metrics.processed.collectionTimestamp);
    
    // Complex objects - parse and compare
    const receivedGithubMetrics = JSON.parse(calls[1][1][3]);
    expect(receivedGithubMetrics).toMatchObject(metrics.github);
    
    const receivedNearMetrics = JSON.parse(calls[1][1][4]);
    expect(receivedNearMetrics).toMatchObject(metrics.near);
    
    const receivedProcessedMetrics = JSON.parse(calls[1][1][5]);
    expect(receivedProcessedMetrics).toMatchObject(metrics.processed);
    
    const receivedValidation = JSON.parse(calls[1][1][6]);
    expect(receivedValidation).toMatchObject(metrics.processed.validation);
    
    // Signature
    expect(calls[1][1][7]).toBe(metrics.signature);
    
    // Verify transaction completion
    expect(calls[2][0]).toBe('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should handle transaction failures', async () => {
    const mockError = new Error('DB Error');
    const metrics = createMockStoredMetrics();
    
    // Setup failed transaction sequence
    const queryMock = mockClient.query as jest.Mock;
    queryMock
      .mockResolvedValueOnce(createMockQueryResult()) // BEGIN
      .mockRejectedValueOnce(mockError)              // INSERT fails
      .mockResolvedValueOnce(createMockQueryResult()); // ROLLBACK

    await expect(storage.saveMetrics('test-project', metrics))
      .rejects
      .toThrow('Failed to save metrics');

    // Verify rollback sequence
    const calls = queryMock.mock.calls;
    expect(calls[0][0]).toBe('BEGIN');
    expect(calls[1][0]).toContain('INSERT INTO metrics');
    expect(calls[2][0]).toBe('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should initialize database tables', async () => {
    const queryMock = mockClient.query as jest.Mock;
    
    // Verify that initialization queries were executed
    const calls = queryMock.mock.calls;
    expect(calls.some(call => call[0].includes('CREATE TABLE IF NOT EXISTS metrics'))).toBeTruthy();
  });

  it('should cleanup resources properly', async () => {
    await storage.cleanup();
    
    // Verify pool was ended
    const pg = jest.requireMock('pg');
    const mockPool = new pg.Pool();
    expect(mockPool.end).toHaveBeenCalled();
  });
});
