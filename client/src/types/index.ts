export * from './auth';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code?: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    version: string;
    [key: string]: unknown;
  };
}

export interface HealthCheckData {
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

export interface ApiWelcomeData {
  name: string;
  description: string;
  documentation: string;
}
