import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';

export function requireRole(allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!req.user.role || !allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(`Access restricted to roles: ${allowedRoles.join(', ')}`)
      );
    }

    next();
  };
}

