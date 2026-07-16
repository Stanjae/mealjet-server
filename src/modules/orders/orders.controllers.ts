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

export const getOrderDetailsById = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const result = await orderService.getOrderDetailsById(
      req.user as IUserDocument,
      orderId as string,
    );

    ApiResponse.success(res, { order: result.order }, result.message);
  },
);

export const getOrderDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const { checkoutId } = req.params;
    const result = await orderService.getOrderDetails(
      req.user as IUserDocument,
      checkoutId as string,
    );

    ApiResponse.success(res, result, "Order details retrieved successfully");
  },
);

export const getVendorOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const { vendorId } = req.params;
    const result = await orderService.getVendorOrders(
      req.user as IUserDocument,
      vendorId as string,
    );

    ApiResponse.success(res, result, "Vendor orders retrieved successfully");
  },
);

export const updateOrderStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;

    console.log(
      "Received request to update order status:",
      req.body,
      "for order ID:",
      orderId,
    );

    const result = await orderService.updateOrderStatus(
      req,
      req.user as IUserDocument,
      orderId as string,
      req.body,
    );

    ApiResponse.success(res, result, "Order status updated successfully");
  },
);

export const vendorRetryDispatch = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;

    const result = await orderService.vendorRetryDispatch(
      req,
      req.user as IUserDocument,
      orderId as string,
    );

    ApiResponse.success(res, result, "Dispatch retry started successfully");
  },
);

export const adminProcessRefund = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;

    const result = await orderService.adminProcessRefund(
      req,
      req.user as IUserDocument,
      orderId as string,
      req.body,
    );

    ApiResponse.success(res, result, result.message);
  },
);

export const riderAcceptDispatch = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const result = await orderService.riderAcceptDispatch(
      req,
      req.user as IUserDocument,
      orderId as string,
    );

    ApiResponse.success(res, result, "Order accepted successfully");
  },
);

export const riderUpdateDeliveryStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const result = await orderService.riderUpdateDeliveryStatus(
      req,
      req.user as IUserDocument,
      orderId as string,
      req.body,
    );

    ApiResponse.success(res, result, "Delivery status updated successfully");
  },
);

export const getCustomerOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const { message, orders } = await orderService.getCustomerOrders(
      req.user as IUserDocument,
      req.query as Record<string, string | undefined>,
    );

    ApiResponse.success(res, { orders }, message);
  },
);

export const getCustomerOrdersSummary = asyncHandler(
  async (req: Request, res: Response) => {
    const { message, ...orderResults } =
      await orderService.getCustomerOrdersSummary(req.user as IUserDocument);

    ApiResponse.success(res, orderResults, message);
  },
);

export const revalidateCheckoutSession = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const {message, ...restResult} = await orderService.revalidateCheckoutSession(
      req.user as IUserDocument,
      orderId as string,
    );

    ApiResponse.success(
      res,
      restResult,
      message,
    );
  },
);
