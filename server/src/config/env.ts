import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from .env file (prioritizing current or root)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(5000),
  API_PREFIX: z.string().default('/api/v1'),
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .default('postgresql://postgres:postgres@localhost:5432/stockflow_dev?schema=public'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters').default('stockflow_super_secret_jwt_key_2026_production_ready'),
  JWT_EXPIRES_IN: z.string().default('24h'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.format();
    console.error('Environment configuration validation failed:', JSON.stringify(formatted, null, 2));
    throw new Error('Invalid environment variables. Please check your configuration.');
  }

  return result.data;
};

export const env = parseEnv();
export type Environment = z.infer<typeof envSchema>;

