/**
 * API Router Implementation
 * 
 * Provides REST endpoints for accessing metrics and project status.
 * Currently supports:
 * - GET /metrics/:projectId - Retrieve latest metrics
 * - GET /projects/:projectId/status - Get project status
 * 
 * All endpoints return standardized APIResponse objects with
 * proper error handling and logging.
 */

import { Router, Request, Response } from 'express';
import { PostgresStorage } from '../storage/postgres';
import { Logger } from '../utils/logger';
import { APIResponse, MetricsResponse, ProjectStatusResponse } from './types';
import { ErrorCode } from '../utils/errors';
import { formatError } from '../types/common';

export interface RouterConfig {
  storage: PostgresStorage;
  logger: Logger;
}

export class APIRouter {
  private router: Router;
  private readonly storage: PostgresStorage;
  private readonly logger: Logger;

  constructor(config: RouterConfig) {
    this.router = Router();
    this.storage = config.storage;
    this.logger = config.logger;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.get('/metrics/:projectId', this.getMetrics.bind(this));
    this.router.get('/projects/:projectId/status', this.getProjectStatus.bind(this));
  }

  private async getMetrics(
    req: Request,
    res: Response<APIResponse<MetricsResponse>>
  ): Promise<void> {
    try {
      const { projectId } = req.params;
      const metrics = await this.storage.getLatestMetrics(projectId);
      
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
        data: {
          metrics
        }
      });
    } catch (error) {
      this.logger.error('Failed to get metrics', {
        error: formatError(error),
        context: {
          projectId: req.params.projectId
        }
      });
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Internal server error'
        }
      });
    }
  }

  private async getProjectStatus(
    req: Request,
    res: Response<APIResponse<ProjectStatusResponse>>
  ): Promise<void> {
    try {
      const { projectId } = req.params;
      const metrics = await this.storage.getLatestMetrics(projectId);

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

      const lastSync = metrics.collectionTimestamp;
      const isActive = Date.now() - lastSync < 24 * 60 * 60 * 1000;

      res.json({
        success: true,
        data: {
          projectId,
          status: {
            isActive,
            lastSync,
            hasErrors: metrics.validation.errors.length > 0
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to get project status', {
        error: formatError(error),
        context: {
          projectId: req.params.projectId
        }
      });
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Internal server error'
        }
      });
    }
  }

  getRouter(): Router {
    return this.router;
  }
}
