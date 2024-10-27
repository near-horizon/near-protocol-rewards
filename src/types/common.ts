// Base JSON value types
export type JSONValue = 
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue }
  | ErrorDetail;  // Allow ErrorDetail in JSONValue

export interface ErrorDetail {
  message: string;
  name: string;
  stack?: string;
  code?: string;
}

export interface LogContext {
  [key: string]: JSONValue;
}

export interface ErrorLogContext {
  error: ErrorDetail;
  context?: Record<string, JSONValue>;
}

interface ErrorWithCode extends Error {
  code?: string;
}

export function formatError(error: unknown): ErrorDetail {
  if (error instanceof Error) {
    const errorWithCode = error as ErrorWithCode;
    return {
      message: errorWithCode.message,
      name: errorWithCode.name,
      stack: errorWithCode.stack,
      code: errorWithCode.code
    };
  }
  return {
    message: String(error),
    name: 'UnknownError'
  };
}

export type APIErrorResponse = {
  code: string;
  message: string;
  details?: Record<string, JSONValue>;
};

export type APISuccessResponse<T> = {
  data: T;
  metadata?: Record<string, JSONValue>;
};
