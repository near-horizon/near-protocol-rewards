import winston from 'winston';

export interface LoggerConfig {
  projectId: string;
  level?: string;
}

export class Logger {
  private logger: winston.Logger;

  constructor(config: LoggerConfig) {
    this.logger = winston.createLogger({
      level: config.level || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { projectId: config.projectId },
      transports: [
        new winston.transports.Console()
      ]
    });
  }

  info(message: string, meta?: Record<string, any>): void {
    this.logger.info(message, meta);
  }

  error(message: string, meta?: Record<string, any>): void {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: Record<string, any>): void {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: Record<string, any>): void {
    this.logger.debug(message, meta);
  }
}
