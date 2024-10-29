import { JSONValue } from './json';

export interface LogContext {
  [key: string]: JSONValue | undefined;
}

export interface ErrorContext extends LogContext {
  error: JSONValue;
}
