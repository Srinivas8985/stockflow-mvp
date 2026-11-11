import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../utils/appError';
import { env } from '../../config/env';

export class AuthController {
  async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await authService.signup(req.body);

      // Set secure authentication cookie
      res.cookie('token', data.token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
      });

      sendSuccess(res, data, 'User and organization registered successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await authService.login(req.body);

      // Set secure authentication cookie
      res.cookie('token', data.token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
      });

      sendSuccess(res, data, 'User authenticated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      const data = await authService.getMe(req.user.id, req.user.organizationId);
      sendSuccess(res, data, 'Authenticated profile retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.clearCookie('token', {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      sendSuccess(res, { loggedOut: true }, 'Successfully logged out', 200);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
