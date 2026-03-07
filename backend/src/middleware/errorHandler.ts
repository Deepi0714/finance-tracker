import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError | ZodError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof ZodError) {
    const details = err.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    res.status(422).json({ error: 'Validation failed', details });
    return;
  }
  const statusCode = (err as AppError).statusCode || 500;
  const message    = (err as AppError).isOperational ? err.message : 'Internal server error';
  if (statusCode >= 500) logger.error(`${statusCode} — ${err.message}`, { stack: err.stack });
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const createError = (message: string, statusCode: number): AppError => {
  const err: AppError = new Error(message);
  err.statusCode    = statusCode;
  err.isOperational = true;
  return err;
};
