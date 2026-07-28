import { asyncHandler } from "@shared/middleware/error.middleware";
import { ApiResponse } from "@shared/utils/api-response";
import { Request, Response } from "express";
import {
  FullMenuItemPayload,
  UpdateMenuItemPayload,
  UpdateMenuItemStockStatusPayload,
} from "@shared/schemas/menu.schema";
import { IMenuReqFiles } from "./menu.types";
import { getPageFromQuery } from "@shared/utils/helpers";
import menuService from "./menu.service";
import { IUserDocument } from "@modules/users";

export const createMenuItem = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await menuService.createMenuItem(
      req.user as IUserDocument,
      req.body as FullMenuItemPayload,
      req.files as IMenuReqFiles,
    );
    ApiResponse.created(res, result.menuitem, result.message);
  },
);

export const getMenuItems = asyncHandler(
  async (req: Request, res: Response) => {
    const page = getPageFromQuery(req.query.page);
    const result = await menuService.getMenuItems(
      req.params.vendorId as string,
      page,
      typeof req.query.search === "string" ? req.query.search : undefined,
      typeof req.query.categoryId === "string"
        ? req.query.categoryId
        : undefined,
      typeof req.query.stockStatus === "string"
        ? req.query.stockStatus
        : undefined,
    );
    ApiResponse.paginated(res, result.data, result.meta, result.message);
  },
);

export const getMenuItem = asyncHandler(async (req: Request, res: Response) => {
  const result = await menuService.getMenuItem(
    req.params.vendorId as string,
    typeof req.query.itemId === "string" ? req.query.itemId : undefined,
  );
  ApiResponse.success(res, result.data, result.message);
});

export const updateMenuItem = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await menuService.updateMenuItem(
      req.body as UpdateMenuItemPayload,
      req.files as IMenuReqFiles,
    );
    ApiResponse.success(res, result.menuitem, result.message);
  },
);

export const updateMenuItemStockStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await menuService.updateMenuItemStockStatus(
      req.body as UpdateMenuItemStockStatusPayload,
    );
    ApiResponse.success(res, result.menuitem, result.message);
  },
);

export const deleteMenuItem = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await menuService.deleteMenuItem(
      req.params.itemId as string,
    );
    ApiResponse.success(res, result.data, result.message);
  },
);

export const deleteMultipleMenuItems = asyncHandler(
  async (req: Request, res: Response) => {
    const { itemIds } = req.body as { itemIds: string[] };
    const result = await menuService.deleteMultipleMenuItems(itemIds);
    ApiResponse.success(res, result.data, result.message);
  },
);
