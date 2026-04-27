import { asyncHandler } from "@shared/middleware/error.middleware";
import { ApiResponse } from "@shared/utils/api-response";
import { Request, Response } from "express";
import { MJAddToCartItem } from "./orders.types";
import orderService from "./orders.services";
import { IUserDocument } from "@modules/users/user.model";

export const handleValidateCheckoutOrder = asyncHandler(
  async (req: Request, res: Response) => {
    const { payload } = req.body;
    const result = await orderService.handleValidateCheckoutOrder(
      req.user as IUserDocument,
      payload as MJAddToCartItem[],
    );

    ApiResponse.success(
      res,
      { summary: result.summary, checkoutSessionId: result.checkoutSessionId },
      result.message,
    );
  },
);

export const getOrderDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const { checkoutId } = req.params;
    const result = await orderService.getOrderDetails(
      req.user as IUserDocument,
      checkoutId as string,
    );

    ApiResponse.success(
      res,
      { orders: result },
      "Order details retrieved successfully",
    );
  },
);

