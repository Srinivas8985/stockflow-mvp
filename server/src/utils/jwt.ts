import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './appError';

export interface TokenPayload {
  userId: string;
  organizationId: string;
  email: string;
  name?: string;
}

/**
 * Signs a JWT with the user's ID, organization ID, and email in claims.
 */
export function signJwt(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

/**
 * Verifies and decodes a JWT using the environment secret.
 * Rejects missing, malformed, or expired tokens.
 */
export function verifyJwt(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload & {
      userId: string;
      organizationId: string;
      email: string;
    };

    if (!decoded || !decoded.userId || !decoded.organizationId) {
      throw AppError.unauthorized('Invalid token claims: missing user or organization identifier');
    }

    return {
      userId: decoded.userId,
      organizationId: decoded.organizationId,
      email: decoded.email,
      name: decoded.name,
    };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }

    const err = error as { name?: string; message?: string };
    if (err.name === 'TokenExpiredError') {
      throw AppError.unauthorized('Authentication token has expired');
    }
    if (err.name === 'JsonWebTokenError') {
      throw AppError.unauthorized('Malformed or invalid authentication token');
    }

    throw AppError.unauthorized('Failed to authenticate token');
  }
}

