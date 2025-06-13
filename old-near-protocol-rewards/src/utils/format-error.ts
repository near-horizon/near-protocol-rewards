import { ErrorDetail, ErrorCode } from "../types/errors";
import { JSONValue } from "../types/json";

/**
 * Formats any error into a consistent structure
 * for logging and error handling
 */
export function formatError(error: unknown): ErrorDetail {
  if (error instanceof Error) {
    return {
      code: ErrorCode.UNKNOWN_ERROR,
      message: error.message,
      context: {
        name: error.name,
        stack: error.stack,
      },
    };
  }

  if (typeof error === "string") {
    return {
      code: ErrorCode.UNKNOWN_ERROR,
      message: error,
    };
  }

  return {
    code: ErrorCode.UNKNOWN_ERROR,
    message: "Unknown error occurred",
    context: { error: JSON.stringify(error) },
  };
}

export function toErrorContext(error: unknown): { error: ErrorDetail } {
  return { error: formatError(error) };
}

export function toJSONErrorContext(error: unknown): { error: JSONValue } {
  const formatted = formatError(error);
  const jsonError: JSONValue = {
    code: formatted.code,
    message: formatted.message,
  };

  if (formatted.context) {
    jsonError.context = formatted.context;
  }

  return { error: jsonError };
}
