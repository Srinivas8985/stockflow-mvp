import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse';

export class WelcomeController {
  getWelcome(_req: Request, res: Response): void {
    sendSuccess(
      res,
      {
        name: 'StockFlow API',
        description: 'Multi-Tenant SaaS Inventory Management System API',
        documentation: '/api/v1/health',
      },
      'Welcome to StockFlow API v1'
    );
  }
}

export const welcomeController = new WelcomeController();

