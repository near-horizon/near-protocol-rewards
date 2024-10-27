import { Pool } from 'pg';
import { PostgresStorage } from '../../storage/postgres';
import { Logger } from '../../utils/logger';
import { createMockGitHubMetrics, createMockNEARMetrics } from '../helpers/mock-data';
import { StoredMetrics } from '../../types';

describe('PostgresStorage', () => {
  let storage: PostgresStorage;
  let pool: Pool;
  let logger: Logger;

  beforeAll(async () => {
    pool = new Pool({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME || 'test_db',
      user: process.env.TEST_DB_USER || 'test_user',
      password: process.env.TEST_DB_PASSWORD || 'test_password'
    });

    logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as unknown as Logger;

    storage = new PostgresStorage({ 
      connectionConfig: pool, 
      logger 
    });
    
    await storage.initialize();
  });

  afterAll(async () => {
    await storage.cleanup();
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE metrics CASCADE');
  });

  describe('store', () => {
    it('should store metrics successfully', async () => {
      const timestamp = Date.now();
      const metrics: StoredMetrics = {
        projectId: 'test-project',
        github: createMockGitHubMetrics(),
        near: createMockNEARMetrics(),
        processed: {
          timestamp,
          github: createMockGitHubMetrics(),
          near: createMockNEARMetrics(),
          score: {
            total: 85,
            breakdown: { github: 80, near: 90 }
          },
          validation: {
            isValid: true,
            errors: [],
            warnings: [],
            timestamp,
            metadata: {
              source: 'github',
              validationType: 'data'
            }
          },
          metadata: {
            collectionTimestamp: timestamp,
            source: 'github',
            projectId: 'test-project',
            periodStart: timestamp - 1000,
            periodEnd: timestamp
          }
        },
        signature: 'test-signature'
      };

      await storage.store(metrics);

      const result = await storage.getLatestMetrics('test-project');
      expect(result).toBeDefined();
      expect(result?.metadata.projectId).toBe('test-project');
    });

    it('should handle transaction failures', async () => {
      const mockError = new Error('DB Error');
      jest.spyOn(pool, 'query').mockRejectedValueOnce(mockError);

      const metrics = createMockStoredMetrics();
      await expect(storage.store('test-project', metrics))
        .rejects
        .toThrow('Failed to save metrics');
    });
  });
});
