import { Request, Response, NextFunction } from 'express';
import { organizationService } from './organization.service';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../utils/appError';

export class OrganizationController {
  async getCurrentOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      // Enforce tenant context directly from authenticated user
      const data = await organizationService.getOrganizationDetails(req.user.organizationId);
      sendSuccess(res, data, 'Organization details retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async updateCurrentOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      // Never trust client-supplied organizationId; use req.user.organizationId
      const data = await organizationService.updateOrganization(req.user.organizationId, req.body);
      sendSuccess(res, data, 'Organization updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}

export const organizationController = new OrganizationController();
