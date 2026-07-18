import { Router } from "express";
import * as riderController from "./rider.controller";
import { authenticate, authorize } from "@shared/middleware/auth.middleware";
import { uploadDocument } from "@shared/middleware/upload.middleware";
import { validateWithSchema } from "@shared/middleware/validate.middleware";
import { parseFormDataFields } from "@shared/middleware/parseFormData.middleware";
import { fullRiderSchema } from "@shared/schemas/rider.schema";
import { UserRole } from "@shared/types/enums";

const router = Router();

router.post(
  "/create-rider",
  authenticate,
  authorize(UserRole.RIDER),

  uploadDocument.fields([
    { name: "profile_picture", maxCount: 1 },
    { name: "vehicle_document", maxCount: 1 },
    { name: "proof_of_identification", maxCount: 1 },
  ]),
  parseFormDataFields(["address", "bankDetails"]),
  validateWithSchema(fullRiderSchema),
  riderController.createRider,
);

router.get(
  "/is-rider-approved",
  authenticate,
  authorize(UserRole.RIDER),
  riderController.checkRiderApprovalStatus,
);

export default router;
