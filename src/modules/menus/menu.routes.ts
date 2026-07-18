import { authenticate, authorize } from "@shared/middleware/auth.middleware";
import { parseFormDataFields } from "@shared/middleware/parseFormData.middleware";
import { uploadDocument } from "@shared/middleware/upload.middleware";
import { validateWithSchema } from "@shared/middleware/validate.middleware";
import {
  fullMenuItemsSchema,
  updateMenuItemsSchema,
  updateMenuitemStockStatusSchema,
} from "@shared/schemas/menu.schema";
import { Router } from "express";
import * as menuController from "./menu.controller";
import { UserRole } from "@shared/types/enums";

const router = Router();

router.post(
  "/create-menu-item",
  authenticate,
  authorize(UserRole.VENDOR),
  uploadDocument.fields([
    { name: "image", maxCount: 1 },
    { name: "images", maxCount: 4 },
  ]),
  parseFormDataFields(["addons", "allergens", "tags"]),
  validateWithSchema(fullMenuItemsSchema),
  menuController.createMenuItem,
);

router.get(
  "/get-menu-items/:vendorId",
  authenticate,
  authorize(UserRole.VENDOR, UserRole.CUSTOMER),
  menuController.getMenuItems,
);

router.get(
  "/get-menu-item-details/:vendorId",
  authenticate,
  authorize(UserRole.VENDOR, UserRole.CUSTOMER),
  menuController.getMenuItem,
);

router.patch(
  "/update-menu-item",
  authenticate,
  authorize(UserRole.VENDOR),
  uploadDocument.fields([
    { name: "image", maxCount: 1 },
    { name: "images", maxCount: 4 },
  ]),
  parseFormDataFields(["addons", "allergens", "tags"]),
  validateWithSchema(updateMenuItemsSchema),
  menuController.updateMenuItem,
);

router.patch(
  "/update-stock-status",
  authenticate,
  authorize(UserRole.VENDOR),
  validateWithSchema(updateMenuitemStockStatusSchema),
  menuController.updateMenuItemStockStatus,
);

router.delete(
  "/delete-menu-item/:itemId",
  authenticate,
  authorize(UserRole.VENDOR),
  menuController.deleteMenuItem,
);

router.delete(
  "/delete-menu-items",
  authenticate,
  authorize(UserRole.VENDOR),
  menuController.deleteMultipleMenuItems,
);

export default router;
