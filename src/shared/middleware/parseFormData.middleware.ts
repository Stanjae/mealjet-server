import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';
import { logger } from '@shared/utils/logger';

const normalizeArrayFieldNames = (body: Request['body']) => {
  for (const [key, value] of Object.entries(body)) {
    if (!key.endsWith('[]')) continue;

    const normalizedKey = key.slice(0, -2);
    body[normalizedKey] = Array.isArray(value) ? value : [value];
    delete body[key];
  }
};

export const parseFormDataFields = (fields: string[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      normalizeArrayFieldNames(req.body);

      logger.debug('Form fields to parse:', fields);
      logger.debug('Received form body keys:', Object.keys(req.body));

      for (const field of fields) {
        if (req.body[field] !== undefined && req.body[field] !== null && typeof req.body[field] === 'string') {
          logger.debug(`Parsing field "${field}":`, req.body[field].substring(0, 100));
          try {
            req.body[field] = JSON.parse(req.body[field]);
          } catch (error) {
            throw new Error(`Field "${field}" contains invalid JSON: ${req.body[field]}`);
          }
        }
      }
      next();
    } catch (error) {
      const message = error instanceof Error 
        ? error.message 
        : 'Failed to parse form field — invalid JSON';
      next(new AppError(422, message));
    }
  };