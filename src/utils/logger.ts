import winston from 'winston';
import { JSONValue } from '../types/json';
import { ValidationError, isValidationError } from '../types/validation';
import { LogContext, ErrorLogContext } from '../types/logger';
import { formatError } from './format-error';
import { toJSONValue } from '../types/json';

export class Logger {
  private logger: winston.Logger;

  constructor({ projectId }: { projectId: string }) {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { projectId },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  info(message: string, context?: Partial<LogContext>): void {
    this.logger.info(message, this.sanitizeContext(context));
  }

  error(message: string, { error, ...context }: ErrorLogContext): void {
    this.logger.error(message, {
      error: toJSONValue(formatError(error)),
      ...this.sanitizeContext(context)
    });
  }

  warn(message: string, context?: Partial<LogContext>): void {
    this.logger.warn(message, this.sanitizeContext(context));
  }

  debug(message: string, context?: Partial<LogContext>): void {
    this.logger.debug(message, this.sanitizeContext(context));
  }

  private sanitizeContext(context?: Record<string, unknown>): Record<string, JSONValue> {
    if (!context) return {};

    return Object.entries(context).reduce((acc, [key, value]) => {
      if (value === undefined) return acc;
      acc[key] = toJSONValue(value);
      return acc;
    }, {} as Record<string, JSONValue>);
  }
}
