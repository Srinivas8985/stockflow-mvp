import { Request, Response, NextFunction } from 'express';
import { analyticsService } from './analytics.service';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../utils/appError';

export class AnalyticsController {
  async getDashboardAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      // Organization ID derived exclusively from authenticated user context
      const analytics = await analyticsService.getDashboardAnalytics(req.user.organizationId);
      sendSuccess(res, analytics, 'Dashboard analytics retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();

