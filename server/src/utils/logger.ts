export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const levels: Record<string, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
};

const currentLevel = levels[process.env.LOG_LEVEL?.toLowerCase() ?? 'info'] ?? LogLevel.INFO;

function formatMessage(level: string, message: string, ...meta: unknown[]): string {
  const timestamp = new Date().toISOString();
  const metaString = meta.length ? ` ${meta.map((m) => (typeof m === 'object' ? JSON.stringify(m) : m)).join(' ')}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}`;
}

export const logger = {
  debug(message: string, ...meta: unknown[]): void {
    if (currentLevel <= LogLevel.DEBUG) {
      console.debug(formatMessage('debug', message, ...meta));
    }
  },
  info(message: string, ...meta: unknown[]): void {
    if (currentLevel <= LogLevel.INFO) {
      console.info(formatMessage('info', message, ...meta));
    }
  },
  warn(message: string, ...meta: unknown[]): void {
    if (currentLevel <= LogLevel.WARN) {
      console.warn(formatMessage('warn', message, ...meta));
    }
  },
  error(message: string, ...meta: unknown[]): void {
    if (currentLevel <= LogLevel.ERROR) {
      console.error(formatMessage('error', message, ...meta));
    }
  },
};

