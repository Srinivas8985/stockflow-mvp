import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../utils/jwt';
import { AppError } from '../utils/appError';

/**
 * Authentication middleware that verifies the incoming Bearer JWT.
 * Attaches a trusted authenticated-user context (`req.user`) to the Express request.
 *
 * Rules:
 * - Reject missing, malformed, or expired tokens with 401 Unauthorized.
 * - Extracts trusted `organizationId` from the token claims to prevent tenant spoofing.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Authentication token required'));
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next(AppError.unauthorized('Authentication token missing'));
  }

  try {
    const payload = verifyJwt(token);

    req.user = {
      id: payload.userId,
      organizationId: payload.organizationId,
      email: payload.email,
      name: payload.name,
    };

    next();
  } catch (error) {
    next(error);
  }
}
