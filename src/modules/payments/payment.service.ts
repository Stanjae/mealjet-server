import {
  THandlePaymentSuccessDataPayload,
  TInitializePaymentPayload,
} from "./payment.types";
import { redis } from "@shared/config/redis";
import { AppError } from "@shared/middleware/error.middleware";
import { getPaymentProvider } from "./utils/getPaymentProvider";
import { IFullCheckoutSummary, orderService } from "@modules/orders";
import { emitToUser } from "@shared/utils/socket.io";
import { Request } from "express";
import { IUserDocument } from "@modules/users";
import { transactionService } from "@modules/transaction";

class PaymentService {
  async initializePaymentService(
    {
      checkoutSessionId,
      paymentMethod,
      noteForRider,
      noteForVendor,
    }: TInitializePaymentPayload,
    user: IUserDocument,
  ) {
    const cached = await redis.get(`checkout:${checkoutSessionId}`);
    if (!cached) throw new AppError(400, "Checkout session expired");

    const { summary } = JSON.parse(cached) as IFullCheckoutSummary;

    const paymentProvider = getPaymentProvider(paymentMethod);
    if (!paymentProvider) {
      // handle other providers like stripe here
      throw new AppError(500, "Payment method not implemented yet");
    }

    const { paymentUrl, accessCode } = await paymentProvider?.initializePayment(
      {
        customer: user,
        grandTotal: Math.floor(Number(summary.grandTotal)),
        checkoutSessionId,
        noteForRider,
        noteForVendor,
        paymentMethod,
      },
    );

    return {
      paymentUrl,
      accessCode,
      checkoutSessionId,
      paymentMethod,
      message: "Payment initialized successfully",
    };
  }

  async handlePaymentSuccess(
    req: Request,
    data: THandlePaymentSuccessDataPayload,
  ) {
    const { reference, amount, metadata } = data;
    const { customerId, checkoutSessionId } = metadata;

    const existingTransaction = await transactionService
      .transaction()
      .findOne({ reference });
    if (existingTransaction) return;

    // 1. Get cached summary from Redis
    const cached = await redis.get(`checkout:${checkoutSessionId}`);
    if (!cached) return; // session expired, handle gracefully

    const { summary } = JSON.parse(cached) as IFullCheckoutSummary;

    const orders = await orderService.createPaidOrdersFromCheckout(
      summary,
      checkoutSessionId,
      customerId,
      reference,
      data.metadata.paymentMethod,
      metadata.noteForRider,
      metadata.noteForVendor,
    );

    await transactionService.transaction().create({
      reference,
      order: orders.map((o) => o._id.toString()), // all order IDs
      user: customerId,
      type: "payment",
      amount: amount / 100, // convert from kobo back to naira
      currency: "NGN",
      status: "success",
      gateway: data.metadata.paymentMethod,
      gatewayResponse: data, // store raw response for audit
      metadata: { checkoutSessionId },
    });

    await Promise.all(
      orders.map(async (order) => {
        emitToUser(req, order.vendor.toString(), "new_order", {
          orderId: order._id,
          orderNumber: order.orderNumber,
          items: order.items,
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          total: order.total,
        });
      }),
    );

    emitToUser(req, customerId, "checkout_success", {
      orders: orders.map((o) => ({
        orderId: o._id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: o.total,
      })),
    });

    await redis.del(`checkout:${checkoutSessionId}`);
  }

  async handlePaymentFailed(
    req: Request,
    data: THandlePaymentSuccessDataPayload,
  ) {
    const { metadata } = data;
    const { customerId, checkoutSessionId } = metadata;

    // Create a failed transaction record for audit
    await transactionService.transaction().create({
      reference: data.reference,
      user: customerId,
      type: "payment",
      amount: data.amount / 100,
      currency: "NGN",
      status: "failed",
      gateway: data.metadata.paymentMethod,
      gatewayResponse: data,
      metadata: { checkoutSessionId },
    });

    // Notify customer
    emitToUser(req, customerId, "checkout_failed", {
      message: "Payment failed. Please try again.",
    });

    // Clear Redis
    await redis.del(`checkout:${checkoutSessionId}`);
  }
}

const paymentService = new PaymentService();

export default paymentService;
