import { Request, Response, NextFunction } from 'express';
import { healthService } from './health.service';
import { sendSuccess } from '../../utils/apiResponse';

export class HealthController {
  async getHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { result, httpStatus } = await healthService.getHealth();
      
      if (httpStatus === 200) {
        sendSuccess(res, result, 'Service health check passed', 200);
      } else {
        res.status(httpStatus).json({
          success: false,
          message: 'Service health check degraded',
          data: result,
          meta: {
            timestamp: result.timestamp,
            version: result.version,
          },
        });
      }
    } catch (error) {
      next(error);
    }
  }
}

export const healthController = new HealthController();

