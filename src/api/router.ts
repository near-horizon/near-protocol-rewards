import express, { Router, Request, Response, NextFunction } from 'express';
import { PostgresStorage } from '../storage/postgres';
import { MetricsCalculator } from '../calculator/metrics-calculator';
import { Logger } from '../utils/logger';
import { 
  APIResponse, 
  MetricsResponse, 
  ProjectStatusResponse,
  ValidationStatusResponse 
} from './types';

interface RouterConfig {
  storage: PostgresStorage;
  calculator: MetricsCalculator;
  logger: Logger;
}

export class APIRouter {
  private router: Router;
  private readonly storage: PostgresStorage;
  private readonly calculator: MetricsCalculator;
  private readonly logger: Logger;

  constructor(config: RouterConfig) {
    this.router = Router();
    this.storage = config.storage;
    this.calculator = config.calculator;
    this.logger = config.logger;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Get current metrics
    this.router.get(
      '/projects/:projectId/metrics/current',
      this.handleAsync(this.getCurrentMetrics.bind(this))
    );

    // Get metrics history
    this.router.get(
      '/projects/:projectId/metrics/history',
      this.handleAsync(this.getMetricsHistory.bind(this))
    );

    // Get project status
    this.router.get(
      '/projects/:projectId/status',
      this.handleAsync(this.getProjectStatus.bind(this))
    );

    // Get validation status
    this.router.get(
      '/projects/:projectId/validation',
      this.handleAsync(this.getValidationStatus.bind(this))
    );
  }

  private handleAsync(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
  ): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      fn(req, res, next).catch(next);
    };
  }

  private async getCurrentMetrics(
    req: Request,
    res: Response<APIResponse<MetricsResponse>>
  ): Promise<void> {
    const { projectId } = req.params;
    const metrics = await this.storage.getLatestMetrics(projectId);

    if (!metrics) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'No metrics found for project'
        }
      });
      return;
    }

    this.logger.info('Retrieved current metrics', { projectId });
    res.json({
      success: true,
      data: {
        current: metrics,
        history: {
          timestamps: [],
          scores: [],
          githubActivity: [],
          nearActivity: []
        }
      }
    });
  }

  private async getMetricsHistory(
    req: Request,
    res: Response<APIResponse<MetricsResponse>>
  ): Promise<void> {
    const { projectId } = req.params;
    const { startTime, endTime } = req.query;

    const history = await this.storage.getMetricsHistory(
      projectId,
      Number(startTime),
      Number(endTime)
    );

    this.logger.info('Retrieved metrics history', { 
      projectId, 
      startTime, 
      endTime 
    });

    res.json({
      success: true,
      data: {
        current: await this.storage.getLatestMetrics(projectId),
        history: {
          timestamps: history.map(m => m.timestamp),
          scores: history.map(m => m.score),
          githubActivity: history.map(m => m.github.activity),
          nearActivity: history.map(m => m.near.activity)
        }
      }
    });
  }

  private async getProjectStatus(
    req: Request,
    res: Response<APIResponse<ProjectStatusResponse>>
  ): Promise<void> {
    const { projectId } = req.params;
    const metrics = await this.storage.getLatestMetrics(projectId);

    if (!metrics) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Project not found'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: {
        projectId,
        nearAccount: metrics.near.metadata.account,
        githubRepo: metrics.github.metadata.repo,
        status: {
          githubIntegration: this.getIntegrationStatus(metrics.github.metadata),
          nearIntegration: this.getIntegrationStatus(metrics.near.metadata),
          lastSync: metrics.metadata.timestamp,
          validationStatus: this.getValidationStatusType(metrics.validation)
        }
      }
    });
  }

  private getIntegrationStatus(metadata: { lastSync?: number }): 'active' | 'error' | 'inactive' {
    if (!metadata.lastSync) return 'inactive';
    const hoursSinceSync = (Date.now() - metadata.lastSync) / (1000 * 60 * 60);
    return hoursSinceSync < 24 ? 'active' : 'error';
  }

  private getValidationStatusType(validation: { 
    errors: any[]; 
    warnings: any[]; 
  }): 'valid' | 'warning' | 'error' {
    if (validation.errors.length > 0) return 'error';
    if (validation.warnings.length > 0) return 'warning';
    return 'valid';
  }

  private formatValidationMessages(validation: { 
    errors: Array<{ code: string; message: string }>;
    warnings: Array<{ code: string; message: string }>;
  }): ValidationStatusResponse['github' | 'near'] {
    const messages = [
      ...validation.errors.map(e => ({ type: 'error' as const, ...e })),
      ...validation.warnings.map(w => ({ type: 'warning' as const, ...w }))
    ];

    return {
      status: this.getValidationStatusType(validation),
      messages
    };
  }

  private async getValidationStatus(
    req: Request,
    res: Response<APIResponse<ValidationStatusResponse>>
  ): Promise<void> {
    const { projectId } = req.params;
    const metrics = await this.storage.getLatestMetrics(projectId);

    if (!metrics) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Project not found'
        }
      });
      return;
    }

    const response: ValidationStatusResponse = {
      github: this.formatValidationMessages(metrics.github.validation),
      near: this.formatValidationMessages(metrics.near.validation),
      lastChecked: metrics.validation.timestamp
    };

    res.json({
      success: true,
      data: response
    });
  }

  getRouter(): Router {
    return this.router;
  }
}
