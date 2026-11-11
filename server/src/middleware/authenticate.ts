import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../utils/jwt';
import { AppError } from '../utils/appError';

function extractToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.split(' ')[1];
    if (bearer && bearer.trim()) return bearer.trim();
  }

  // Cookie fallback for HTTPS authenticated sessions
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)token=([^;]*)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1].trim());
    }
  }

  return undefined;
}

/**
 * Authentication middleware that verifies the incoming Bearer JWT or Secure HTTPS cookie.
 * Attaches a trusted authenticated-user context (`req.user`) to the Express request.
 *
 * Rules:
 * - Reject missing, malformed, or expired tokens with 401 Unauthorized.
 * - Extracts trusted `organizationId` from the token claims to prevent tenant spoofing.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);

  if (!token) {
    return next(AppError.unauthorized('Authentication token required'));
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
