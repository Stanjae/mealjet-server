import { generateTokenPair, verifyAccessToken, verifyRefreshToken, } from "@shared/utils/jwt-util.js";
import { ApiResponse } from "@shared/utils/api-response.js";
import { UserModel } from "@modules/users/user.model.js";
import { cookieOptions } from "@shared/utils/helpers";
export async function authenticate(req, res, next) {
    const token = req.cookies?.accessToken;
    if (!token) {
        ApiResponse.unauthorized(res, "No token provided");
        return;
    }
    try {
        const payload = verifyAccessToken(token);
        const user = await UserModel.findById(payload.userId).select("-passwordHash");
        if (!user || user.status !== "active") {
            ApiResponse.unauthorized(res, "User not found or inactive");
            return;
        }
        req.user = user;
        next();
    }
    catch {
        ApiResponse.unauthorized(res, "Invalid or expired token");
    }
}
export function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            ApiResponse.unauthorized(res);
            return;
        }
        if (!roles.includes(req.user.role)) {
            ApiResponse.forbidden(res, "Insufficient permissions");
            return;
        }
        next();
    };
}
// middleware/isAuthenticated.ts
export async function isAuthenticatedMiddleware(req, res, next) {
    const accessToken = req.cookies?.accessToken;
    if (accessToken) {
        try {
            const payload = verifyAccessToken(accessToken);
            const user = await UserModel.findById(payload.userId).select("-passwordHash -refreshTokens");
            if (user?.status === "active") {
                req.user = user;
                return next();
            }
        }
        catch {
            /* fall through */
        }
    }
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
        ApiResponse.unauthorized(res, "Not authenticated");
        return;
    }
    try {
        const payload = verifyRefreshToken(refreshToken);
        const user = await UserModel.findById(payload.userId).select("-passwordHash -refreshTokens");
        if (!user || user.status !== "active") {
            ApiResponse.unauthorized(res, "Not authenticated");
            return;
        }
        const { accessToken: newAccessToken } = generateTokenPair({
            userId: payload.userId,
            role: user.role,
            email: user.email,
        });
        res.cookie("accessToken", newAccessToken, cookieOptions(15 * 60 * 1000));
        req.user = user;
        next();
    }
    catch {
        ApiResponse.unauthorized(res, "Session expired");
    }
}
