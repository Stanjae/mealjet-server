import { authService } from "./auth.service.js";
import { ApiResponse } from "@shared/utils/api-response.js";
import { asyncHandler } from "@shared/middleware/error.middleware";
import { cookieOptions } from "@shared/utils/helpers.js";
export const register = asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    ApiResponse.created(res, result);
});
export const verifyEmail = asyncHandler(async (req, res) => {
    const result = await authService.verifyEmail(req.query.token);
    ApiResponse.success(res, result);
});
export const verifyNow = asyncHandler(async (req, res) => {
    const result = await authService.verifyNow(req.query.email);
    ApiResponse.success(res, result);
});
export const login = asyncHandler(async (req, res) => {
    const { user, tokens } = await authService.login(req.body);
    // Refresh token goes in an httpOnly cookie
    res.cookie("refreshToken", tokens.refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000));
    res.cookie("accessToken", tokens.accessToken, cookieOptions(15 * 60 * 1000)); // 15 min expiry for access token
    ApiResponse.success(res, { user }, "Login successful");
});
export const refresh = asyncHandler(async (req, res) => {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
        ApiResponse.unauthorized(res, "No refresh token");
        return;
    }
    const tokens = await authService.refresh(refreshToken);
    res.cookie("refreshToken", tokens.refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000, "/auth/refresh"));
    ApiResponse.success(res, { accessToken: tokens.accessToken });
});
export const logout = asyncHandler(async (req, res) => {
    const { refreshToken } = req.cookies;
    if (req.user && refreshToken) {
        await authService.logout(req.user._id.toString(), refreshToken);
    }
    res.clearCookie('accessToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });
    ApiResponse.success(res, null, "Logged out successfully");
});
export const isAuthenticated = asyncHandler(async (req, res) => {
    const userObj = req?.user?.toObject();
    const { passwordHash, refreshTokens, _id, ...safeUser } = userObj;
    ApiResponse.success(res, { isAuthenticated: true, user: { ...safeUser, id: _id } }, "User is authenticated");
});
