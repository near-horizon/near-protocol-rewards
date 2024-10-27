import { Pool, PoolConfig } from 'pg';
import { PostgresStorage } from '../../src/storage/postgres';
import { Logger } from '../../src/utils/logger';
import { 
  createMockStoredMetrics,
  createMockGitHubMetrics,
  createMockNEARMetrics 
} from '../helpers/mock-data';

describe('PostgresStorage', () => {
  let pool: Pool;
  let storage: PostgresStorage;

  beforeAll(async () => {
    const poolConfig: PoolConfig = {
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD
    };

    pool = new Pool(poolConfig);
    
    // Ensure tables exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS metrics (
        id SERIAL PRIMARY KEY,
        project_id VARCHAR(255) NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  });

  beforeEach(async () => {
    // Clean tables before each test
    await pool.query('TRUNCATE TABLE metrics CASCADE');

    storage = new PostgresStorage({
      connectionConfig: {
        host: process.env.POSTGRES_HOST,
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.POSTGRES_DB,
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD
      },
      logger: new Logger({ projectId: 'test' })
    });
  });

  describe('saveMetrics', () => {
    it('should store metrics successfully', async () => {
      const timestamp = Date.now();
      const projectId = 'test-project';
      
      // Use createMockStoredMetrics with overrides
      const metrics = createMockStoredMetrics({
        projectId,
        timestamp,
        github: createMockGitHubMetrics(),
        near: createMockNEARMetrics(),
        score: {
          total: 85,
          breakdown: { github: 80, near: 90 }
        }
      });

      await storage.saveMetrics(projectId, metrics);

      const result = await storage.getLatestMetrics(projectId);
      expect(result).toBeDefined();
      expect(result?.projectId).toBe(projectId);
    });

    it('should handle transaction failures', async () => {
      const mockError = new Error('DB Error');
      jest.spyOn(pool, 'query').mockRejectedValueOnce(mockError as never);

      const projectId = 'test-project';
      const metrics = createMockStoredMetrics({
        projectId,
        timestamp: Date.now()
      });

      await expect(storage.saveMetrics(projectId, metrics))
        .rejects
        .toThrow('Failed to save metrics');
    });
  });
});
