import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { APIRouter, RouterConfig } from './router';
import { PostgresStorage } from '../storage/postgres';
import { Logger } from '../utils/logger';
import { RequestLogContext } from './types';
import { formatError } from '../types/common';

interface ServerConfig {
  storage: PostgresStorage;
  logger: Logger;
  cors?: cors.CorsOptions;
}

export class APIServer {
  private readonly app: Application;
  private readonly storage: PostgresStorage;
  private readonly logger: Logger;

  constructor(config: ServerConfig) {
    this.storage = config.storage;
    this.logger = config.logger;
    this.app = express();
    this.setupMiddleware(config.cors);
    this.setupRoutes();
  }

  private setupMiddleware(corsOptions?: cors.CorsOptions): void {
    this.app.use(helmet());
    this.app.use(cors(corsOptions || {}));
    this.app.use(express.json());

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const logData: RequestLogContext = {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: Date.now() - startTime,
          ip: req.ip || null, // Convert undefined to null
          timestamp: new Date().toISOString()
        };
        this.logger.info('API Request', { request: logData });
      });

      next();
    });

    // Error handling
    this.app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      this.logger.error('API Error', {
        error: formatError(err),
        context: { type: 'api_error' }
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred'
        }
      });
    });
  }

  private setupRoutes(): void {
    const routerConfig: RouterConfig = {
      storage: this.storage,
      logger: this.logger
    };
    
    const apiRouter = new APIRouter(routerConfig);
    this.app.use('/api', apiRouter.getRouter());
  }
}
