import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../utils/appError';

export class AuthController {
  async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await authService.signup(req.body);
      sendSuccess(res, data, 'User and organization registered successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await authService.login(req.body);
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
}

export const authController = new AuthController();
