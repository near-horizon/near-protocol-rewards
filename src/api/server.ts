import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createRouter } from './router';
import { PostgresStorage } from '../storage/postgres';
import { Logger } from '../utils/logger';
import { toErrorContext } from '../utils/format-error';

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
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        this.logger.info('API Request', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: Date.now() - startTime
        });
      });

      next();
    });
  }

  private setupRoutes(): void {
    const router = createRouter(this.storage, this.logger);
    this.app.use('/api', router);
  }

  async start(port: number): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(port, () => {
        this.logger.info(`API server started on port ${port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    // Cleanup resources
    await this.storage.cleanup();
  }
}
