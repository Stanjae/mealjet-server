import { authenticate, authorize } from "@shared/middleware/auth.middleware";
import { Router } from "express";
import * as menuCategoryController from "./menuCategory.controller";
import {
  createMenuCategorySchema,
  updateMenuCategorySchema,
} from "@shared/schemas/menuCategorySchema";
import { validateWithSchema } from "@shared/middleware/validate.middleware";
import { UserRole } from "@shared/types/enums";

const router = Router();

router.post(
  "/create",
  authenticate,
  authorize(UserRole.VENDOR),
  validateWithSchema(createMenuCategorySchema),
  menuCategoryController.createMenuCategory,
);

router.get(
  "/get-categories/:vendorId",
  authenticate,
  authorize(UserRole.VENDOR, UserRole.CUSTOMER),
  menuCategoryController.getMenuCategories,
);

router.patch(
  "/update",
  authenticate,
  authorize(UserRole.VENDOR),
  validateWithSchema(updateMenuCategorySchema),
  menuCategoryController.updateMenuCategory,
);

router.delete(
  "/delete/:categoryId",
  authenticate,
  authorize(UserRole.VENDOR),
  menuCategoryController.deleteMenuCategory,
);

router.delete(
  "/delete-multiple-categories",
  authenticate,
  authorize(UserRole.VENDOR),
  menuCategoryController.deleteMultipleMenuCategories,
);

export default router;
