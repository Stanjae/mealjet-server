import { authenticate, authorize } from "@shared/middleware/auth.middleware";
import { parseFormDataFields } from "@shared/middleware/parseFormData.middleware";
import { uploadDocument } from "@shared/middleware/upload.middleware";
import { validateWithSchema } from "@shared/middleware/validate.middleware";
import { fullRestaurantSchema } from "@shared/schemas/vendor.schema";
import { Router } from "express";
import * as vendorController from "./vendor.controller";
import { UserRole } from "@shared/types/enums";

const router = Router();

router.post(
  "/create-vendor",
  authenticate,
  authorize(UserRole.VENDOR),
  uploadDocument.fields([
    { name: "logo", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
    { name: "proof_of_registration", maxCount: 1 },
    { name: "proof_of_identification", maxCount: 1 },
  ]),
  parseFormDataFields([
    "address",
    "openingHours",
    "bankDetails",
    "cuisineTypes",
    "tags",
  ]),
  validateWithSchema(fullRestaurantSchema),
  vendorController.createVendor,
);

router.get(
  "/profile-count",
  authenticate,
  authorize(UserRole.VENDOR),
  vendorController.profileCount,
);

router.get(
  "/get-vendor-profiles",
  authenticate,
  authorize(UserRole.VENDOR),
  vendorController.getVendorProfiles,
);

router.get(
  "/get-all-vendors",
  authenticate,
  authorize(UserRole.VENDOR, UserRole.CUSTOMER),
  vendorController.getAllVendors,
);

router.get(
  "/get-vendor-profile/:vendorId",
  authenticate,
  authorize(UserRole.VENDOR, UserRole.CUSTOMER),
  vendorController.getVendorProfile,
);

export default router;
