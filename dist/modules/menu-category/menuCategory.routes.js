import { authenticate, authorize } from "@shared/middleware/auth.middleware";
import { Router } from "express";
import * as menuCategoryController from "./menuCategory.controller";
import { createMenuCategorySchema } from "@shared/schemas/menuCategorySchema";
import { validateWithSchema } from "@shared/middleware/validate.middleware";
const router = Router();
router.post("/create", authenticate, authorize("vendor"), validateWithSchema(createMenuCategorySchema), menuCategoryController.createMenuCategory);
router.get("/get-categories/:vendorId", authenticate, authorize("vendor"), menuCategoryController.getMenuCategories);
/*
  deleteMenuCategory: '/menu-category/delete',
  updateMenuCategory: '/menu-category/update', */
export default router;
