import { Request, Response } from "express";
import { authService } from "./auth.service.js";
import { ApiResponse } from "@shared/utils/api-response.js";
import { asyncHandler } from "@shared/middleware/error.middleware";
import { cookieOptions } from "@shared/utils/helpers.js";
import { IUserDocument } from "@modules/users/user.model.js";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  ApiResponse.created(res, {}, result.message);
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { isVerified, title, message } = await authService.verifyEmail(
    req.query.token as string,
  );
  ApiResponse.success(res, { isVerified, title }, message);
});

export const verifyNow = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.verifyNow(req.query.email as string);
  ApiResponse.success(res, {}, result.message);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { user, tokens } = await authService.login(req.body);
  // Refresh token goes in an httpOnly cookie
  res.cookie(
    "refreshToken",
    tokens.refreshToken,
    cookieOptions(7 * 24 * 60 * 60 * 1000),
  );
  res.cookie("accessToken", tokens.accessToken, cookieOptions(15 * 60 * 1000)); // 15 min expiry for access token
  ApiResponse.success(res, { user }, "Login successful");
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.cookies;
  if (req.user && refreshToken) {
    await authService.logout(req.user._id.toString(), refreshToken);
  }
  res.clearCookie("accessToken", cookieOptions());

  res.clearCookie("refreshToken", cookieOptions());
  ApiResponse.success(res, null, "Logged out successfully");
});

export const isAuthenticated = asyncHandler(
  async (req: Request, res: Response) => {
    const { userObj } = await authService.isAuthenticated(req);

    ApiResponse.success(
      res,
      { isAuthenticated: true, user: userObj },
      "User is authenticated",
    );
  },
);

export const updateUserProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await authService.updateUserProfile(
      req?.user as IUserDocument,
      req.body,
      typeof req.query.type === "string" ? req.query.type : undefined,
    );
    const user = result.user.toObject();
    ApiResponse.success(res, { user }, result.message);
  },
);

export const updateUserCurrentAddress = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await authService.updateUserCurrentAddress(
      req?.user as IUserDocument,
      req.body,
    );
    const user = result.user.toObject();
    ApiResponse.success(res, { user }, result.message);
  },
);

export const deleteUserAddress = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await authService.deleteUserAddress(
      req?.user as IUserDocument,
      req.params.addressId as string,
    );
    const user = result.user.toObject();
    ApiResponse.success(res, { user }, result.message);
  },
);
