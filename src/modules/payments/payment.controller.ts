import { asyncHandler } from "@shared/middleware/error.middleware";
import { ApiResponse } from "@shared/utils/api-response";
import { Request, Response } from "express";
import paymentService from "./payment.service";
import { TInitializePaymentPayload } from "./payment.types";
import { IUserDocument } from "@modules/users/user.model";

export const initializePayment = asyncHandler(
  async (req: Request, res: Response) => {
    const { payload } = req.body;
    const {
      paymentMethod,
      paymentUrl,
      accessCode,
      checkoutSessionId,
      message,
    } = await paymentService.initializePaymentService(
      payload as TInitializePaymentPayload,
      req.user as IUserDocument,
    );

    ApiResponse.success(
      res,
      {
        paymentUrl,
        checkoutSessionId,
        paymentMethod,
        accessCode,
      },
      message,
    );
  },
);
