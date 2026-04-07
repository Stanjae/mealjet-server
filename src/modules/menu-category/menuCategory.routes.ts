import { authenticate, authorize } from "@shared/middleware/auth.middleware";
import { Router } from "express";
import * as menuCategoryController from "./menuCategory.controller";
import {
  createMenuCategorySchema,
  updateMenuCategorySchema,
} from "@shared/schemas/menuCategorySchema";
import { validateWithSchema } from "@shared/middleware/validate.middleware";

const router = Router();

router.post(
  "/create",
  authenticate,
  authorize("vendor"),
  validateWithSchema(createMenuCategorySchema),
  menuCategoryController.createMenuCategory,
);

router.get(
  "/get-categories/:vendorId",
  authenticate,
  authorize("vendor", 'customer'),
  menuCategoryController.getMenuCategories,
);

router.patch(
  "/update",
  authenticate,
  authorize("vendor"),
  validateWithSchema(updateMenuCategorySchema),
  menuCategoryController.updateMenuCategory,
);

router.delete(
  "/delete/:categoryId",
  authenticate,
  authorize("vendor"),
  menuCategoryController.deleteMenuCategory,
);

router.delete(
  "/delete-multiple-categories",
  authenticate,
  authorize("vendor"),
  menuCategoryController.deleteMultipleMenuCategories,
);

export default router;
