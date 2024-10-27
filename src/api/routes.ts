import express from 'express';
import { PostgresStorage } from '../storage/postgres';
import { Logger } from '../utils/logger';
import { BaseError, ErrorCode } from '../utils/errors';

interface APIConfig {
  logger: Logger;
  storage: PostgresStorage;
}

export function createRouter(config: APIConfig) {
  const router = express.Router();
  const { logger, storage } = config;

  // Get project status and health
  router.get('/metrics/:projectId/status', async (req, res) => {
    try {
      const { projectId } = req.params;
      const status = await storage.getProjectStatus(projectId);
      
      res.json({
        projectId,
        lastCollection: status.lastCollection,
        isHealthy: status.isHealthy,
        collectionErrors: status.recentErrors,
        nextCollection: status.nextScheduledCollection
      });
    } catch (error) {
      logger.error('Failed to get status', { error, projectId: req.params.projectId });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get latest metrics with validation results
  router.get('/metrics/:projectId/validation', async (req, res) => {
    try {
      const { projectId } = req.params;
      const metrics = await storage.getLatestMetrics(projectId);
      
      if (!metrics) {
        res.status(404).json({ error: 'No metrics found' });
        return;
      }

      res.json({
        metrics,
        validation: {
          github: metrics.validation.github,
          near: metrics.validation.near,
          lastValidated: metrics.validation.timestamp
        }
      });
    } catch (error) {
      logger.error('Failed to get validation', { error, projectId: req.params.projectId });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get reward calculations
  router.get('/metrics/:projectId/rewards', async (req, res) => {
    try {
      const { projectId } = req.params;
      const metrics = await storage.getLatestMetrics(projectId);
      
      if (!metrics) {
        res.status(404).json({ error: 'No metrics found' });
        return;
      }

      res.json({
        projectId,
        timestamp: metrics.timestamp,
        score: metrics.score,
        reward: {
          usdAmount: metrics.score.total * 100, // Simple calculation for beta
          nearAmount: metrics.score.total * 10,  // Simple calculation for beta
          calculatedAt: metrics.timestamp
        }
      });
    } catch (error) {
      logger.error('Failed to get rewards', { error, projectId: req.params.projectId });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
