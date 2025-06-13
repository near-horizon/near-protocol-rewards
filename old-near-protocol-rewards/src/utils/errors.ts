import { BaseError, ErrorCode, ErrorDetail } from "../types/errors";

export function createError(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
): BaseError {
  return new BaseError(message, code, details);
}

export function isBaseError(error: unknown): error is BaseError {
  return error instanceof BaseError;
}

export function toErrorCode(error: unknown): ErrorCode {
  if (isBaseError(error)) {
    return error.code;
  }
  return ErrorCode.UNKNOWN_ERROR;
}
