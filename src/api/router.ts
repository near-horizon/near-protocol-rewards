/**
 * API Router Implementation
 * 
 * Provides REST endpoints for accessing metrics and project status.
 * Currently supports:
 * - GET /metrics/:projectId - Retrieve latest metrics
 * - GET /projects/:projectId/status - Get project status
 * - GET /metrics/:projectId/history - Get historical metrics
 * - GET /validation/:projectId - Get validation results
 * 
 * All endpoints return standardized APIResponse objects with
 * proper error handling and logging.
 */

import { Router } from 'express';
import { PostgresStorage } from '../storage/postgres';
import { StoredMetrics, ProcessedMetrics, GitHubMetrics, NEARMetrics } from '../types/metrics';
import { Logger } from '../utils/logger';
import { toErrorContext } from '../utils/format-error';
import { ErrorCode } from '../types/errors';
import { validateApiKey } from '../middleware/auth';
import { GitHubCollector } from '../collectors/github';
import { NEARCollector } from '../collectors/near';

export function createRouter(storage: PostgresStorage, logger: Logger): Router {
  const router = Router();

  // GET /metrics/:projectId - Retrieve latest metrics
  router.get('/metrics/:projectId', async (req, res) => {
    try {
      const metrics = await storage.getLatestMetrics(req.params.projectId);
      
      if (metrics === null) {
        res.status(404).json({
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'No metrics found for project'
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
          message: 'Failed to get metrics'
        }
      });
    }
  });

  // GET /projects/:projectId/status - Get project status
  router.get('/projects/:projectId/status', async (req, res) => {
    try {
      const metrics = await storage.getLatestMetrics(req.params.projectId);
      
      if (!metrics) {
        res.status(404).json({
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'Project not found'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: {
          lastUpdate: metrics.processed.metadata.collectionTimestamp,
          score: metrics.score,
          isValid: metrics.validation.isValid,
          errors: metrics.validation.errors,
          warnings: metrics.validation.warnings
        }
      });
    } catch (error) {
      logger.error('Failed to get project status', toErrorContext(error));
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to get project status'
        }
      });
    }
  });

  // GET /metrics/:projectId/history - Get historical metrics
  router.get('/metrics/:projectId/history', async (req, res) => {
    try {
      const { start, end } = req.query;
      const startTime = parseInt(start as string);
      const endTime = parseInt(end as string);

      if (isNaN(startTime) || isNaN(endTime)) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.INVALID_PARAMETERS,
            message: 'Invalid time range parameters'
          }
        });
        return;
      }

      const metrics = await storage.queryMetrics(req.params.projectId, {
        start: startTime,
        end: endTime
      });

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Failed to get metrics history', toErrorContext(error));
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to get metrics history'
        }
      });
    }
  });

  // GET /validation/:projectId - Get validation results
  router.get('/validation/:projectId', async (req, res) => {
    try {
      const validations = await storage.getValidations(req.params.projectId);
      
      if (!validations) {
        res.status(404).json({
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'No validation results found'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: validations
      });
    } catch (error) {
      logger.error('Failed to get validation results', toErrorContext(error));
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to get validation results'
        }
      });
    }
  });

  // Admin Routes
  router.get('/admin/export', validateApiKey, async (req, res) => {
    try {
      const projects = await storage.getAllProjects();
      const exportData = await Promise.all(
        projects.map(async (projectId) => {
          const metrics = await storage.getLatestMetrics(projectId);
          const validations = await storage.getValidations(projectId);
          return {
            projectId,
            metrics,
            validations
          };
        })
      );

      res.json({
        success: true,
        data: { projects: exportData }
      });
    } catch (error) {
      logger.error('Failed to export data', toErrorContext(error));
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to export data'
        }
      });
    }
  });

  // Force metrics collection
  router.post('/admin/collect/:projectId', validateApiKey, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { source } = req.query;

      if (!source || (source !== 'github' && source !== 'near')) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.INVALID_PARAMETERS,
            message: 'Invalid source parameter. Must be "github" or "near"'
          }
        });
        return;
      }

      const timestamp = Date.now();
      let githubMetrics: GitHubMetrics | null = null;
      let nearMetrics: NEARMetrics | null = null;

      if (source === 'github') {
        const collector = new GitHubCollector({
          repo: projectId,
          token: process.env.GITHUB_TOKEN!,
          logger
        });
        githubMetrics = await collector.collectMetrics();
      } else {
        const collector = new NEARCollector({
          account: projectId,
          logger,
          apiKey: process.env.NEAR_API_KEY
        });
        nearMetrics = await collector.collectMetrics();
      }

      const storedMetrics: StoredMetrics = {
        projectId,
        timestamp,
        github: githubMetrics!,
        near: nearMetrics!,
        processed: {
          timestamp,
          collectionTimestamp: timestamp,
          github: githubMetrics!,
          near: nearMetrics!,
          projectId,
          periodStart: timestamp - (24 * 60 * 60 * 1000),
          periodEnd: timestamp,
          score: {
            total: 0,
            breakdown: { github: 0, near: 0 }
          },
          validation: {
            isValid: true,
            errors: [],
            warnings: [],
            timestamp,
            metadata: {
              source: source as 'github' | 'near',
              validationType: 'data'
            }
          },
          metadata: {
            collectionTimestamp: timestamp,
            source: source as 'github' | 'near',
            projectId,
            periodStart: timestamp - (24 * 60 * 60 * 1000),
            periodEnd: timestamp
          }
        },
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
          timestamp,
          metadata: {
            source: source as 'github' | 'near',
            validationType: 'data'
          }
        },
        signature: '',
        score: {
          total: 0,
          breakdown: { github: 0, near: 0 }
        }
      };

      await storage.saveMetrics(storedMetrics);

      res.json({
        success: true,
        data: storedMetrics
      });
    } catch (error) {
      logger.error('Failed to collect metrics', toErrorContext(error));
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to collect metrics'
        }
      });
    }
  });

  // Get collector status
  router.get('/admin/status', validateApiKey, async (req, res) => {
    try {
      const githubRateLimit = await storage.getGithubRateLimit();
      const nearApiStatus = await storage.getNearApiStatus();

      res.json({
        success: true,
        data: {
          collectors: {
            github: {
              rateLimit: githubRateLimit,
              isHealthy: githubRateLimit.remaining > 100
            },
            near: {
              status: nearApiStatus,
              isHealthy: nearApiStatus.status === 'operational'
            }
          },
          storage: {
            isConnected: await storage.isHealthy()
          }
        }
      });
    } catch (error) {
      logger.error('Failed to get collector status', toErrorContext(error));
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to get collector status'
        }
      });
    }
  });

  return router;
}
