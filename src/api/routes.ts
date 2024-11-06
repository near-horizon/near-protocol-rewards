import express from 'express';
import { PostgresStorage } from '../storage/postgres';
import { Logger } from '../utils/logger';
import { ErrorCode } from '../types/errors';
import { toErrorContext } from '../utils/format-error';

interface APIConfig {
  logger: Logger;
  storage: PostgresStorage;
}

export function createRouter(config: APIConfig) {
  const router = express.Router();
  const { logger, storage } = config;

  router.get('/metrics/:projectId', async (req, res) => {
    try {
      const { projectId } = req.params;
      const metrics = await storage.getLatestMetrics(projectId);
      
      if (!metrics) {
        res.status(404).json({ 
          success: false, 
          error: { 
            code: ErrorCode.NOT_FOUND,
            message: 'No metrics found'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Failed to get metrics', toErrorContext(error));
      res.status(500).json({ 
        success: false,
        error: { 
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Internal server error'
        }
      });
    }
  });

  return router;
}
