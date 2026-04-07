// src/shared/utils/logger.ts
import { createLogger, format, transports } from 'winston';
import { env } from '@shared/config/env.js';
const { combine, timestamp, printf, colorize, errors, json } = format;
const devFormat = combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), printf(({ level, message, timestamp, stack }) => `${timestamp} [${level}]: ${stack || message}`));
const prodFormat = combine(timestamp(), errors({ stack: true }), json());
export const logger = createLogger({
    level: env.NODE_ENV === 'production' ? 'warn' : 'debug',
    format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
    transports: [
        new transports.Console(),
        // Add file transport in production:
        // new transports.File({ filename: 'logs/error.log', level: 'error' }),
    ],
    exitOnError: false,
});
