import { JSONValue } from './json';
import { ErrorDetail } from './errors';

export interface LogContext {
  [key: string]: JSONValue | undefined;
}

export interface ErrorLogContext {
  error: ErrorDetail | string;
  context?: LogContext;
}

export interface LogEntry {
  message: string;
  context?: LogContext;
  error?: ErrorDetail;
} 