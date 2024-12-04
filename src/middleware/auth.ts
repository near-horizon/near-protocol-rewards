import { Request, Response, NextFunction } from "express";
import { ErrorCode } from "../types/errors";

export function validateApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: {
        code: ErrorCode.UNAUTHORIZED,
        message: "API key is required",
      },
    });
  }

  // TODO: Implement actual API key validation
  // For now, just pass through
  next();
}
