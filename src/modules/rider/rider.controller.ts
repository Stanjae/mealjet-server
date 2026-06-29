import { IVendorReqFiles } from "@modules/vendor/vendor.types";
import { asyncHandler } from "@shared/middleware/error.middleware";
import { FullRiderData } from "@shared/schemas/rider.schema";
import { ApiResponse } from "@shared/utils/api-response";
import { Request, Response } from "express";
import { riderService } from "./rider.service";
import { IUserDocument } from "@modules/users/user.model";

export const createRider = asyncHandler(async (req: Request, res: Response) => {
 const result = await riderService.createRider(
    req.user as IUserDocument,
    req.body as FullRiderData,
    req.files as IVendorReqFiles,
  );
  ApiResponse.created(res, {}, result.message);
});

export const checkRiderApprovalStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as IUserDocument;
  const isApproved = await riderService.isRiderApproved(user._id.toString());
  ApiResponse.success(res, isApproved, "Rider approval status retrieved successfully");
});
