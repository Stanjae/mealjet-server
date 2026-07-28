import { asyncHandler } from "@shared/middleware/error.middleware";
import { ApiResponse } from "@shared/utils/api-response";
import type { Request, Response } from "express";
import walletService from "./wallet.service";
import { IUserDocument } from "@modules/users";

export const createWallet = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await walletService.createWallet(
      req.body,
      req.user as IUserDocument,
    );
    ApiResponse.created(res, {});
  },
);
