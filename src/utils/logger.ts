import { LogLevel, LogContext, ErrorLogContext } from '../types/logger';
import { toJSONErrorContext } from './format-error';

// Define the interface
export interface ILogger {
  level: string;
  shouldLog: (level: string) => boolean;
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
}

// Implement the interface
export class ConsoleLogger implements ILogger {
  readonly level: string;
  
  constructor(level: string = 'info') {
    this.level = level;
  }

  shouldLog(level: string): boolean {
    const levels = ['error', 'warn', 'info', 'debug'];
    return levels.indexOf(level) <= levels.indexOf(this.level);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.debug(message, context);
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.info(message, context);
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn(message, context);
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      console.error(message, context);
    }
  }
}

// Export a default logger instance
export const defaultLogger = new ConsoleLogger();
export type Logger = ConsoleLogger;

