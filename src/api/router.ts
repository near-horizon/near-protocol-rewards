/**
 * API Router Implementation
 * 
 * Provides REST endpoints for accessing GitHub metrics and project status.
 */

import { Router } from 'express';
import { ErrorCode } from '../types/errors';
import { GitHubCollector } from '../collectors/github';
import { validateApiKey } from '../middleware/auth';

export function createRouter(collector: GitHubCollector): Router {
  const router = Router();

  router.get('/metrics/:projectId', validateApiKey, async (req, res) => {
    try {
      const metrics = await collector.collectMetrics();
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error collecting metrics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.PROCESSING_ERROR,
          message: 'Failed to collect metrics'
        }
      });
    }
  });

  router.get('/status', validateApiKey, async (req, res) => {
    try {
      const githubStatus = await collector.testConnection();
      res.json({
        success: true,
        data: {
          github: githubStatus
        }
      });
    } catch (error) {
      console.error('Error checking status:', error);
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.PROCESSING_ERROR,
          message: 'Failed to check service status'
        }
      });
    }
  });

  return router;
}
