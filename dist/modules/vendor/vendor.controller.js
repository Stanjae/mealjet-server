import { asyncHandler } from "@shared/middleware/error.middleware";
import { ApiResponse } from "@shared/utils/api-response";
import { vendorService } from "./vendor.service";
export const createVendor = asyncHandler(async (req, res) => {
    const result = await vendorService.createVendor(req.user, req.body, req.files);
    ApiResponse.created(res, result.vendor, result.message);
});
export const profileCount = asyncHandler(async (req, res) => {
    const result = await vendorService.profileCount(req?.user?._id.toString());
    ApiResponse.success(res, { count: result.vendorCount }, result.message);
});
export const getVendorProfiles = asyncHandler(async (req, res) => {
    const result = await vendorService.getVendorProfiles(req?.user?._id.toString());
    ApiResponse.success(res, { vendors: result.vendors }, result.message);
});
