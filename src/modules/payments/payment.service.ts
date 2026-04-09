import { IUserDocument } from "@modules/users/user.model";
import {
  THandlePaymentSuccessDataPayload,
  TInitializePaymentPayload,
} from "./payment.types";
import { redis } from "@shared/config/redis";
import { AppError } from "@shared/middleware/error.middleware";
import { getPaymentProvider } from "./utils/getPaymentProvider";
import { IFullCheckoutSummary } from "@modules/orders/orders.types";
import { generateOrderNumber } from "@shared/utils/helpers";
import Order from "@modules/orders/orders.model";
import Transaction from "@modules/transaction/transaction.model";
import Vendor from "@modules/vendor/vendor.model";
import { emitToUser } from "@shared/utils/socket.io";
import { Request } from "express";

class PaymentService {
  async initializePaymentService(
    { checkoutSessionId, paymentMethod }: TInitializePaymentPayload,
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
      user,
      Math.floor(Number(summary.grandTotal)),
      checkoutSessionId,
    );

    return {
      paymentUrl,
      accessCode,
      checkoutSessionId,
      paymentMethod,
      message: "Payment initialized successfully",
    };
  }

  async handlePaymentSuccess(req:Request,data: THandlePaymentSuccessDataPayload) {
    const { reference, amount, metadata } = data;
    const { customerId, checkoutSessionId } = metadata;

    // 1. Get cached summary from Redis
    const cached = await redis.get(`checkout:${checkoutSessionId}`);
    if (!cached) return; // session expired, handle gracefully

    const { summary } = JSON.parse(cached) as IFullCheckoutSummary;

    // 2. Create one order per vendor
    const orders = await Promise.all(
      summary.newCart.map(async (vendor) => {
        const orderNumber = await generateOrderNumber();

        return Order.create({
          orderNumber,
          checkoutSessionId,
          customer: customerId,
          vendor: vendor.vendorId,
          items: vendor.items,
          status: "pending",
          statusHistory: [
            { status: "pending", timestamp: new Date(), updatedBy: customerId },
          ],
          deliveryAddress: vendor.deliveryAddress,
          deliveryLocation: vendor.deliveryLocation,
          subtotal: vendor.calculatedSubtotal,
          deliveryFee: vendor.vendorDeliveryFee,
          serviceFee: vendor.serviceCharge,
          total: vendor.total,
          paymentStatus: "paid",
          paymentMethod: "",
          paymentReference: reference,
          currency: "NGN",
          orderType: "delivery",
          //
          //promoCode:'',
          //customerNotes:'',
          //discount:0,
            //estimatedDeliveryTime: null,
            //actualDeliveryTime: null,
        });
      }),
    );

    // 3. Create ONE transaction record for the whole checkout
    await Transaction.create({
      reference,
      order: orders.map((o) => o._id), // all order IDs
      user: customerId,
      type: "payment",
      amount: amount / 100, // convert from kobo back to naira
      currency: "NGN",
      status: "success",
      gateway: "paystack",
      gatewayResponse: data, // store raw response for audit
      metadata: { checkoutSessionId },
    });

    // 4. Notify each vendor via Socket.io
    await Promise.all(
      orders.map(async (order) => {
        const vendor = await Vendor.findById(order.vendor);
        emitToUser(req, vendor?._id.toString() as string, "new_order", {
          orderId: order._id,
          orderNumber: order.orderNumber,
          items: order.items,
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          total: order.total,
        });
      }),
    );

    // 5. Notify customer via Socket.io
    emitToUser(req, customerId, "checkout_success", {
      orders: orders.map((o) => ({
        orderId: o._id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: o.total,
      })),
    });

    // 6. Delete summary from Redis (no longer needed)
    await redis.del(`checkout:${checkoutSessionId}`);
  }
}

const paymentService = new PaymentService();

export default paymentService;
