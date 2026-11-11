import { checkDatabaseConnection, DatabaseStatus } from '../../config/database';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: {
      status: 'connected' | 'disconnected';
      latencyMs?: number;
      error?: string;
    };
  };
}

export class HealthService {
  async getHealth(): Promise<{ result: HealthCheckResult; httpStatus: number }> {
    const dbStatus: DatabaseStatus = await checkDatabaseConnection();

    const isDbHealthy = dbStatus.connected;
    const overallStatus: 'healthy' | 'degraded' = isDbHealthy ? 'healthy' : 'degraded';
    const httpStatus = isDbHealthy ? 200 : 503;

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: {
          status: isDbHealthy ? 'connected' : 'disconnected',
          ...(dbStatus.latencyMs !== undefined && { latencyMs: dbStatus.latencyMs }),
          ...(dbStatus.error && { error: dbStatus.error }),
        },
      },
    };

    return { result, httpStatus };
  }
}

export const healthService = new HealthService();

