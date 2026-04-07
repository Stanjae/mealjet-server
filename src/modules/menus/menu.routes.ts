import { authenticate, authorize } from "@shared/middleware/auth.middleware";
import { parseFormDataFields } from "@shared/middleware/parseFormData.middleware";
import { uploadDocument } from "@shared/middleware/upload.middleware";
import { validateWithSchema } from "@shared/middleware/validate.middleware";
import { fullMenuItemsSchema, updateMenuItemsSchema, updateMenuitemStockStatusSchema } from "@shared/schemas/menu.schema";
import { Router } from "express";
import * as menuController from "./menu.controller";

const router = Router();

router.post(
  "/create-menu-item",
  authenticate,
  authorize("vendor"),
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
  authorize("vendor", "customer"),
  menuController.getMenuItems,
);

router.get(
  "/get-menu-item-details/:vendorId",
  authenticate,
  authorize("vendor", "customer"),
  menuController.getMenuItem,
);

router.patch(
  "/update-menu-item",
  authenticate,
  authorize("vendor"),
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
  authorize("vendor"),
  validateWithSchema(updateMenuitemStockStatusSchema),
  menuController.updateMenuItemStockStatus,
);

router.delete(
  "/delete-menu-item/:itemId",
  authenticate,
  authorize("vendor"),
  menuController.deleteMenuItem,
);

router.delete(
  "/delete-menu-items",
  authenticate,
  authorize("vendor"),
  menuController.deleteMultipleMenuItems,
);

export default router;
