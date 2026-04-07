// src/shared/utils/jwt.util.ts
import jwt from 'jsonwebtoken';
import { env } from '@shared/config/env.js';
export function generateTokenPair(payload) {
    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
        expiresIn: env.JWT_ACCESS_EXPIRES,
    });
    const refreshToken = jwt.sign({ userId: payload.userId }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES });
    return { accessToken, refreshToken };
}
export function verifyAccessToken(token) {
    return jwt.verify(token, env.JWT_ACCESS_SECRET);
}
export function verifyRefreshToken(token) {
    return jwt.verify(token, env.JWT_REFRESH_SECRET);
}
