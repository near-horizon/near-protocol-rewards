import { Pool } from 'pg';
import { PostgresStorage } from '../../src/storage/postgres';
import { Logger } from '../../src/utils/logger';
import { createMockGitHubMetrics, createMockNEARMetrics } from '../helpers/mock-data';
import { StoredMetrics, ProcessedMetrics } from '../../src/types';

describe('PostgresStorage', () => {
  let storage: PostgresStorage;
  let pool: Pool;
  let logger: Logger;

  beforeAll(async () => {
    const poolConfig = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'near_rewards_test',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres'
    };

    pool = new Pool(poolConfig);
    logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as unknown as Logger;

    storage = new PostgresStorage({ 
      connectionConfig: poolConfig,
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

  describe('saveMetrics', () => {
    it('should store metrics successfully', async () => {
      const timestamp = Date.now();
      const projectId = 'test-project';
      
      const metrics: StoredMetrics = {
        projectId,
        timestamp,
        github: createMockGitHubMetrics(),
        near: createMockNEARMetrics(),
        score: {
          total: 85,
          breakdown: { github: 80, near: 90 }
        },
        processed: {
          timestamp,
          collectionTimestamp: timestamp,
          source: 'github',
          projectId,
          periodStart: timestamp - 1000,
          periodEnd: timestamp,
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
          }
        },
        signature: 'test-signature'
      };

      await storage.saveMetrics(projectId, metrics);

      const result = await storage.getLatestMetrics(projectId);
      expect(result).toBeDefined();
      expect(result?.projectId).toBe(projectId);
    });

    it('should handle transaction failures', async () => {
      const mockError = new Error('DB Error');
      jest.spyOn(pool, 'query').mockRejectedValueOnce(mockError as never);

      const projectId = 'test-project';
      const metrics: StoredMetrics = {
        projectId,
        timestamp: Date.now(),
        github: createMockGitHubMetrics(),
        near: createMockNEARMetrics(),
        score: {
          total: 85,
          breakdown: { github: 80, near: 90 }
        },
        processed: {
          timestamp: Date.now(),
          collectionTimestamp: Date.now(),
          source: 'github',
          projectId,
          periodStart: Date.now() - 1000,
          periodEnd: Date.now(),
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
            timestamp: Date.now(),
            metadata: {
              source: 'github',
              validationType: 'data'
            }
          }
        },
        signature: 'test-signature'
      };

      await expect(storage.saveMetrics(projectId, metrics))
        .rejects
        .toThrow('Failed to save metrics');
    });
  });
});
