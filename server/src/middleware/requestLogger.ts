import morgan, { StreamOptions } from 'morgan';
import { logger } from '../utils/logger';
import { env } from '../config/env';

const stream: StreamOptions = {
  write: (message: string) => logger.info(message.trim()),
};

const format = env.NODE_ENV === 'production' ? 'combined' : ':method :url :status :res[content-length] - :response-time ms';

export const requestLogger = morgan(format, { stream });

