import { Request, Response, NextFunction } from 'express';
import { ErrorCode } from '../types/errors';

export function validateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      success: false,
      error: {
        code: ErrorCode.UNAUTHORIZED,
        message: 'Invalid API key'
      }
    });
  }

  next();
} 