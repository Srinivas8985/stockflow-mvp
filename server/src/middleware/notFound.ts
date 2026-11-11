import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Cannot find ${req.method} ${req.originalUrl} on this server`));
}

