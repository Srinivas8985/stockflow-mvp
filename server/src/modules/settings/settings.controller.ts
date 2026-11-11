import { Request, Response, NextFunction } from 'express';
import { settingsService } from './settings.service';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../utils/appError';

export class SettingsController {
  async getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      // Organization ID derived exclusively from authenticated user context
      const settings = await settingsService.getSettings(req.user.organizationId);
      sendSuccess(res, settings, 'Settings retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      const settings = await settingsService.updateSettings(req.user.organizationId, req.body);
      sendSuccess(res, settings, 'Settings updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}

export const settingsController = new SettingsController();

