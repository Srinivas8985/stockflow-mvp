import { Request, Response, NextFunction } from 'express';
import { organizationService } from './organization.service';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../utils/appError';

export class OrganizationController {
  async getCurrentOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw AppError.unauthorized();
      const data = await organizationService.getOrganizationDetails(req.user.organizationId);
      sendSuccess(res, data, 'Organization details retrieved', 200);
    } catch (error) {
      next(error);
    }
  }

  async updateOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw AppError.unauthorized();
      const data = await organizationService.updateOrganization(req.user.organizationId, req.body);
      sendSuccess(res, data, 'Organization updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async getMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw AppError.unauthorized();
      const data = await organizationService.getMembers(req.user.organizationId);
      sendSuccess(res, data, 'Organization members list', 200);
    } catch (error) {
      next(error);
    }
  }

  async addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw AppError.unauthorized();
      const data = await organizationService.addMember(req.user.organizationId, req.body);
      sendSuccess(res, data, 'Team member added successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}

export const organizationController = new OrganizationController();

