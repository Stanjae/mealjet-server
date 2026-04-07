import { AppError } from './error.middleware';
const normalizeArrayFieldNames = (body) => {
    for (const [key, value] of Object.entries(body)) {
        if (!key.endsWith('[]'))
            continue;
        const normalizedKey = key.slice(0, -2);
        body[normalizedKey] = Array.isArray(value) ? value : [value];
        delete body[key];
    }
};
export const parseFormDataFields = (fields) => (req, _res, next) => {
    try {
        normalizeArrayFieldNames(req.body);
        for (const field of fields) {
            if (req.body[field] && typeof req.body[field] === 'string') {
                req.body[field] = JSON.parse(req.body[field]);
            }
        }
        next();
    }
    catch {
        next(new AppError(422, `Failed to parse form field — invalid JSON`));
    }
};
