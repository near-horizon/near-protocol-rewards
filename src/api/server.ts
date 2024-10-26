import { Application, Request, Response, NextFunction } from 'express';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { APIRouter } from './router';
import { PostgresStorage } from '../storage/postgres';
import { MetricsCalculator } from '../calculator/metrics-calculator';
import { Logger } from '../utils/logger';
import { BaseError, ErrorCode } from '../utils/errors';

interface ServerConfig {
  port: number;
  storage: PostgresStorage;
  calculator: MetricsCalculator;
  logger: Logger;
  cors?: cors.CorsOptions;
}

export class APIServer {
  private app: Application;
  private readonly port: number;
  private readonly storage: PostgresStorage;
  private readonly calculator: MetricsCalculator;
  private readonly logger: Logger;

  constructor(config: ServerConfig) {
    this.port = config.port;
    this.storage = config.storage;
    this.calculator = config.calculator;
    this.logger = config.logger;
    this.app = express();
    this.setupMiddleware(config.cors);
    this.setupRoutes();
  }

  private setupMiddleware(corsOptions?: cors.CorsOptions): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors(corsOptions || {}));
    this.app.use(express.json());

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        this.logger.info('API Request', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: Date.now() - startTime,
          ip: req.ip
        });
      });

      next();
    });

    // Error handling
    this.app.use((error: Error | BaseError, _req: Request, res: Response, _next: NextFunction) => {
      this.logger.error('API Error', { error });

      if (error instanceof BaseError) {
        res.status(400).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.context
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'An unexpected error occurred'
        }
      });
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        timestamp: Date.now()
      });
    });

    // API router
    const apiRouter = new APIRouter({
      storage: this.storage,
      calculator: this.calculator,
      logger: this.logger
    });

    this.app.use('/api/v1', apiRouter.getRouter());

    // 404 handler
    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Endpoint not found'
        }
      });
    });
  }

  public async start(): Promise<void> {
    try {
      await this.storage.initialize();
      
      this.app.listen(this.port, () => {
        this.logger.info('API Server started', { 
          port: this.port,
          environment: process.env.NODE_ENV 
        });
      });
    } catch (error) {
      this.logger.error('Failed to start API server', { error });
      throw error;
    }
  }

  public getApp(): Application {
    return this.app;
  }
}
