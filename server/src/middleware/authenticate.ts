import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/security';
import { AppError } from '../utils/appError';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Authentication token missing or invalid'));
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyAccessToken(token);

  if (!payload) {
    return next(AppError.unauthorized('Invalid or expired access token'));
  }

  req.user = {
    id: payload.userId,
    email: payload.email,
    role: payload.role,
    organizationId: payload.organizationId,
    organizationSlug: payload.organizationSlug,
  };

  next();
}

