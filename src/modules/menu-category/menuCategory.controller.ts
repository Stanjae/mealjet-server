import { asyncHandler } from "@shared/middleware/error.middleware";
import { ApiResponse } from "@shared/utils/api-response";
import e, { Request, Response } from "express";
import { menuCategoryService } from "./menuCategory.service";
import { TCreateMeuCategoryPayload } from "./menuCategory.types";
import { getPageFromQuery } from "@shared/utils/helpers";

export const createMenuCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await menuCategoryService.createMenuCategory(
      req.body as TCreateMeuCategoryPayload,
    );
    ApiResponse.created(res, result.data, result.message);
  },
);

export const getMenuCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const page = getPageFromQuery(req.query.page);
    const result = await menuCategoryService.getMenuCategories(
      req.params.vendorId as string,
      page,
      typeof req.query.search === "string" ? req.query.search : undefined,
    );
    ApiResponse.paginated(res, result.data, result.meta, result.message);
  },
);

export const updateMenuCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await menuCategoryService.updateMenuCategory(
      req.body as TCreateMeuCategoryPayload,
    );
    ApiResponse.success(res, result.data, result.message);
  },
);

export const deleteMenuCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await menuCategoryService.deleteMenuCategory(
      req.params.categoryId as string,
    );
    ApiResponse.success(res, result.data, result.message);
  },
);

export const deleteMultipleMenuCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const { categoryIds } = req.body as { categoryIds: string[] };
    const result =
      await menuCategoryService.deleteMultipleMenuCategories(categoryIds);
    ApiResponse.success(res, result.data, result.message);
  },
);
