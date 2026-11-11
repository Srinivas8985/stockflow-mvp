import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/appError';
import { sendError } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    sendError(res, 'Validation failed', 400, formattedErrors, 'VALIDATION_ERROR');
    return;
  }

  // Handle known operational application errors
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error(`Critical operational error: ${err.message}`, err.stack);
    }
    sendError(res, err.message, err.statusCode, err.details);
    return;
  }

  // Handle unexpected or unhandled errors
  logger.error(`Unhandled Exception: ${err.message}`, err.stack);

  const message = env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  const details = env.NODE_ENV === 'development' ? { stack: err.stack } : undefined;

  sendError(res, message, 500, details, 'INTERNAL_SERVER_ERROR');
}

