import { LogContext } from '../types/common';
import { formatError } from './format-error';

export class Logger {
  private readonly projectId: string;

  constructor(config: { projectId: string }) {
    this.projectId = config.projectId;
  }

  info(message: string, context?: LogContext): void {
    process.stdout.write(
      JSON.stringify({
        level: 'info',
        message,
        projectId: this.projectId,
        ...context,
        timestamp: new Date().toISOString()
      }) + '\n'
    );
  }

  error(message: string, context: { error: unknown } & Partial<LogContext>): void {
    const { error, ...restContext } = context;
    process.stderr.write(
      JSON.stringify({
        level: 'error',
        message,
        projectId: this.projectId,
        ...restContext,
        error: formatError(error),
        timestamp: new Date().toISOString()
      }) + '\n'
    );
  }

  warn(message: string, context?: LogContext): void {
    process.stdout.write(
      JSON.stringify({
        level: 'warn',
        message,
        projectId: this.projectId,
        ...context,
        timestamp: new Date().toISOString()
      }) + '\n'
    );
  }

  debug(message: string, context?: LogContext): void {
    process.stdout.write(
      JSON.stringify({
        level: 'debug',
        message,
        projectId: this.projectId,
        ...context,
        timestamp: new Date().toISOString()
      }) + '\n'
    );
  }
}
