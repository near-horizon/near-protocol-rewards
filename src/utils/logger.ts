/**
 * Logger Utility
 * 
 * Provides standardized logging functionality with different log levels.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export class Logger {
  private readonly level: LogLevel;
  private readonly prefix: string;
  private readonly entries: LogEntry[] = [];

  /**
   * Creates a new logger
   * 
   * @param level Minimum log level to display
   * @param prefix Prefix to add to all log messages
   */
  constructor(level: LogLevel = LogLevel.INFO, prefix: string = '') {
    this.level = level;
    this.prefix = prefix ? `[${prefix}] ` : '';
  }

  /**
   * Logs a debug message
   * 
   * @param message Message to log
   * @param context Optional context object
   */
  debug(message: string, context?: Record<string, unknown>): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`${this.prefix}${message}`, context || '');
    }
    this.entries.push({ level: LogLevel.DEBUG, message: `${this.prefix}${message}`, timestamp: new Date().toISOString(), context });
  }

  /**
   * Logs an info message
   * 
   * @param message Message to log
   * @param context Optional context object
   */
  info(message: string, context?: Record<string, unknown>): void {
    if (this.level <= LogLevel.INFO) {
      console.info(`${this.prefix}${message}`, context || '');
    }
    this.entries.push({ level: LogLevel.INFO, message: `${this.prefix}${message}`, timestamp: new Date().toISOString(), context });
  }

  /**
   * Logs a warning message
   * 
   * @param message Message to log
   * @param context Optional context object
   */
  warn(message: string, context?: Record<string, unknown>): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`${this.prefix}${message}`, context || '');
    }
    this.entries.push({ level: LogLevel.WARN, message: `${this.prefix}${message}`, timestamp: new Date().toISOString(), context });
  }

  /**
   * Logs an error message
   * 
   * @param message Message to log
   * @param context Optional context object
   */
  error(message: string, context?: Record<string, unknown>): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`${this.prefix}${message}`, context || '');
    }
    this.entries.push({ level: LogLevel.ERROR, message: `${this.prefix}${message}`, timestamp: new Date().toISOString(), context });
  }

  /**
   * Returns a snapshot of all collected log entries
   */
  getEntries(): LogEntry[] {
    return [...this.entries];
  }
} 