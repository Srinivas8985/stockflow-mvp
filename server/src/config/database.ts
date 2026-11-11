import { PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from '../utils/logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
  });

if (env.NODE_ENV === 'development') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (prisma as any).$on?.('query', (e: { query: string; duration: number }) => {
    logger.debug(`Prisma Query: ${e.query} [${e.duration}ms]`);
  });
}

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export interface DatabaseStatus {
  connected: boolean;
  latencyMs?: number;
  error?: string;
}

/**
 * Checks actual database connectivity by executing a lightweight query.
 */
export async function checkDatabaseConnection(): Promise<DatabaseStatus> {
  const startTime = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - startTime;
    return {
      connected: true,
      latencyMs,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown database error';
    logger.error('Database connection check failed:', errorMsg);
    return {
      connected: false,
      error: errorMsg,
    };
  }
}

