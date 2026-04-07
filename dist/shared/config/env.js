// src/shared/config/env.ts
import dotenv from 'dotenv';
dotenv.config();
const required = [
    'MONGODB_URI', 'REDIS_URL',
    'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET',
    'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET',
    'RESEND_API_KEY', 'EMAIL_FROM',
];
function validateEnv() {
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing env vars: ${missing.join(', ')}`);
    }
    return {
        PORT: parseInt(process.env.PORT || '5000', 10),
        NODE_ENV: process.env.NODE_ENV || 'development',
        CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
        MONGODB_URI: process.env.MONGODB_URI,
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
        JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
        JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
        JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '30d',
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        EMAIL_FROM: process.env.EMAIL_FROM,
        BANK_DETAILS_ENCRYPTION_KEY: process.env.BANK_DETAILS_ENCRYPTION_KEY, // must be 32 chars
    };
}
export const env = validateEnv();
