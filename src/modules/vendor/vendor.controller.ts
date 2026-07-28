import { asyncHandler } from "@shared/middleware/error.middleware";
import { ApiResponse } from "@shared/utils/api-response";
import { Request, Response } from "express";
import { FullRestaurantData } from "@shared/schemas/vendor.schema";
import { IVendorReqFiles } from "./vendor.types";
import { IUserDocument } from "@modules/users";
import vendorService from "./vendor.service";

export const createVendor = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await vendorService.createVendor(
      req.user as IUserDocument,
      req.body as FullRestaurantData,
      req.files as IVendorReqFiles,
    );
    ApiResponse.created(res, result.vendor, result.message);
  },
);

export const profileCount = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await vendorService.profileCount(
      req?.user?._id.toString() as string,
    );
    ApiResponse.success(res, { count: result.vendorCount }, result.message);
  },
);

export const getVendorProfiles = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await vendorService.getVendorProfiles(
      req?.user?._id.toString() as string,
    );
    ApiResponse.success(res, { vendors: result.vendors }, result.message);
  },
);

export const getAllVendors = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await vendorService.getAllVendors();
    ApiResponse.success(res, { vendors: result.vendors }, result.message);
  },
);

export const getVendorProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await vendorService.getVendorProfile(
      req.params.vendorId as string,
    );
    ApiResponse.success(res, { vendor: result.vendor }, result.message);
  },
);
