import { JSONValue } from "./json";
import { ErrorDetail } from "./errors";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: JSONValue;
}

export interface ErrorLogContext {
  error: ErrorDetail;
  [key: string]: JSONValue | ErrorDetail;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context: ErrorLogContext): void;
}

export interface LoggerConfig {
  level?: LogLevel;
  pretty?: boolean;
}
