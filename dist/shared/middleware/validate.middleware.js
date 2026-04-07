import { validationResult } from 'express-validator';
import { ApiResponse } from '@shared/utils/api-response.js';
const normalizeBooleanStrings = (value) => {
    if (typeof value === 'string') {
        const normalizedValue = value.trim().toLowerCase();
        if (normalizedValue === 'true')
            return true;
        if (normalizedValue === 'false')
            return false;
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => normalizeBooleanStrings(item));
    }
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, nestedValue]) => [key, normalizeBooleanStrings(nestedValue)]));
    }
    return value;
};
const normalizeUploadedFiles = (req) => {
    const normalizedFiles = {};
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
        if (!Array.isArray(files) || files.length === 0)
            continue;
        normalizedFiles[fieldName] = files.length === 1 ? files[0] : files;
    }
    return normalizedFiles;
};
export function validate(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const messages = errors.array().map((e) => e.msg);
        ApiResponse.error(res, 'Validation failed', 422, messages);
        return;
    }
    next();
}
export const validateWithSchema = (schema) => (req, res, next) => {
    const normalizedBody = normalizeBooleanStrings(req.body ?? {});
    const normalizedFiles = normalizeUploadedFiles(req);
    const result = schema.safeParse({
        ...normalizedBody,
        ...normalizedFiles,
    });
    if (!result.success) {
        return ApiResponse.error(res, 'Validation failed', 422, formatZodErrors(result.error));
    }
    req.body = result.data; // replace body with parsed/validated data
    next();
};
const formatZodErrors = (error) => {
    return error.issues.map((e) => ({
        field: e.path.length ? e.path.join('.') : 'root',
        message: e.message,
    }));
};
