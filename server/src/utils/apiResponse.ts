import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code?: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    version: string;
    [key: string]: unknown;
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
  meta?: Record<string, unknown>
): Response {
  const response: ApiResponse<T> = {
    success: true,
    ...(message && { message }),
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      ...meta,
    },
  };

  return res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  details?: unknown,
  code?: string
): Response {
  const response: ApiResponse = {
    success: false,
    message,
    error: {
      ...(code && { code }),
      ...(details !== undefined && { details }),
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    },
  };

  return res.status(statusCode).json(response);
}

