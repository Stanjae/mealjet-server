
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ApiResponse } from '@shared/utils/api-response.js';
import { ZodType, ZodError } from 'zod/v4';

const normalizeBooleanStrings = (value: unknown): unknown => {
  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue === 'true') return true;
    if (normalizedValue === 'false') return false;

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeBooleanStrings(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, normalizeBooleanStrings(nestedValue)])
    );
  }

  return value;
};

const normalizeUploadedFiles = (req: Request): Record<string, Express.Multer.File | Express.Multer.File[]> => {
  const normalizedFiles: Record<string, Express.Multer.File | Express.Multer.File[]> = {};

  if (req.file) {
    normalizedFiles[req.file.fieldname] = req.file;
  }

  if (!req.files) {
    return normalizedFiles;
  }

  if (Array.isArray(req.files)) {
    for (const file of req.files) {
      const existingValue = normalizedFiles[file.fieldname];

      if (!existingValue) {
        normalizedFiles[file.fieldname] = file;
        continue;
      }

      normalizedFiles[file.fieldname] = Array.isArray(existingValue)
        ? [...existingValue, file]
        : [existingValue, file];
    }

    return normalizedFiles;
  }

  for (const [fieldName, files] of Object.entries(req.files)) {
    if (!Array.isArray(files) || files.length === 0) continue;
    normalizedFiles[fieldName] = files.length === 1 ? files[0] : files;
  }

  return normalizedFiles;
};

const mergeBodyAndFiles = (
  body: Record<string, unknown>,
  files: Record<string, Express.Multer.File | Express.Multer.File[]>,
) => {
  const merged: Record<string, unknown> = { ...body };

  for (const [key, fileValue] of Object.entries(files)) {
    const bodyValue = merged[key];

    if (bodyValue === undefined) {
      merged[key] = fileValue;
      continue;
    }

    // For array-capable fields, preserve both existing body values and uploaded files.
    if (Array.isArray(bodyValue) || Array.isArray(fileValue)) {
      const bodyArray = Array.isArray(bodyValue) ? bodyValue : [bodyValue];
      const fileArray = Array.isArray(fileValue) ? fileValue : [fileValue];
      merged[key] = [...bodyArray, ...fileArray];
      continue;
    }

    // For single-value fields (e.g. image), prefer uploaded file over string URL.
    merged[key] = fileValue;
  }

  return merged;
};

export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg as string);
    ApiResponse.error(res, 'Validation failed', 422, messages);
    return;
  }
  next();
}

export const validateWithSchema = (schema: ZodType) => 
  (req: Request, res: Response, next: NextFunction) => {
    const normalizedBody = normalizeBooleanStrings(req.body ?? {}) as Record<string, unknown>;
    const normalizedFiles = normalizeUploadedFiles(req);
    const result = schema.safeParse(mergeBodyAndFiles(normalizedBody, normalizedFiles));

    if (!result.success) {
      return ApiResponse.error(res, 'Validation failed', 422, formatZodErrors(result.error));
    }

    req.body = result.data; // replace body with parsed/validated data
    next();
  };

const formatZodErrors = (error: ZodError) => {
  return error.issues.map((e) => ({
    field: e.path.length ? e.path.join('.') : 'root',
    message: e.message,
  }));
};
