import { IUserDocument } from "@modules/users/user.model";
import {
  MJAddToCartItem,
  TProcessRefundPayload,
  TUpdateOrderStatusPayload,
} from "./orders.types";
import {
  buildCheckoutSummary,
  sanitizeToId,
  validateCart,
} from "@shared/utils/helpers";
import { redis } from "@shared/config/redis";
import { AppError } from "@shared/middleware/error.middleware";
import Order from "./orders.model";
import { Request } from "express";
import { emitToUser } from "@shared/utils/socket.io";
import Rider from "@modules/rider/rider.model";
import { AvailabilityStatus } from "@shared/types/enums";
import {
  PAYMENT_STATUSES,
  statusHistoryStates,
} from "@shared/constants/orders.constants";
import OrderStatusAudit from "./order-status-audit.model";
import { UserModel } from "@modules/users/user.model";
import Vendor from "@modules/vendor/vendor.model";
import Transaction from "@modules/transaction/transaction.model";

const DISPATCH_ROUNDS = [
  { batchSize: 3, waitMs: 25_000, radiusMetres: 3_000 },
  { batchSize: 5, waitMs: 30_000, radiusMetres: 6_000 },
  { batchSize: 8, waitMs: 35_000, radiusMetres: 10_000 },
];

const MANUAL_RETRY_COOLDOWN_SECONDS = 60;
const MANUAL_RETRY_WINDOW_SECONDS = 30 * 60;
const MANUAL_RETRY_MAX_PER_WINDOW = 3;

const VENDOR_ALLOWED_TRANSITIONS: Partial<Record<statusHistoryStates, statusHistoryStates[]>> = {
  [statusHistoryStates.pending]: [statusHistoryStates.preparing, statusHistoryStates.cancelled],
  [statusHistoryStates.confirmed]: [
    statusHistoryStates.preparing,
    statusHistoryStates.cancelled,
  ],
  [statusHistoryStates.preparing]: [statusHistoryStates.ready, statusHistoryStates.cancelled],
  [statusHistoryStates.ready]: [statusHistoryStates.cancelled],
};

const RIDER_ALLOWED_TRANSITIONS: Partial<Record<statusHistoryStates, statusHistoryStates[]>> = {
  [statusHistoryStates.assigned]: [statusHistoryStates.picked_up],
  [statusHistoryStates.picked_up]: [statusHistoryStates.on_the_way],
  [statusHistoryStates.on_the_way]: [statusHistoryStates.delivered],
};

class OrderService {
  private async queueRefundForCancelledOrder(req: Request, order: any, user: IUserDocument) {
    if (order.paymentStatus !== PAYMENT_STATUSES[1]) return; // paid
    if (order.refundStatus === "pending" || order.refundStatus === "success") return;

    const existingRefund = await Transaction.findOne({
      order: order._id,
      type: "refund",
      status: { $in: ["pending", "success"] },
    }).lean();

    if (!existingRefund) {
      await Transaction.create({
        reference: `refund_${order.orderNumber}_${Date.now()}`,
        order: [order._id],
        user: order.customer,
        type: "refund",
        amount: order.total,
        currency: order.currency || "NGN",
        status: "pending",
        gateway: order.paymentMethod,
        metadata: {
          orderId: order._id.toString(),
          reason: order.cancellationReason,
          requestedBy: user._id.toString(),
          requestedByRole: user.role,
        },
        createdAt: new Date(),
      });
    }

    await Order.findByIdAndUpdate(order._id, {
      refundStatus: "pending",
      refundFailureReason: null,
    });

    const customerId = order.customer?.toString();
    if (customerId) {
      emitToUser(req, customerId, "order_refund_pending", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: order.total,
      });
    }

    const admins = await UserModel.find({ role: "admin", status: "active" })
      .select("_id")
      .lean();

    admins.forEach((admin) => {
      emitToUser(req, admin._id.toString(), "refund_review_required", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: order.total,
      });
    });
  }

  private async resolveVendorOwnerId(vendorId: string | undefined) {
    if (!vendorId) return null;

    const vendor = await Vendor.findById(vendorId).select("owner").lean();
    return (vendor as any)?.owner?.toString() || null;
  }

  private async emitDispatchProgress(
    req: Request,
    order: any,
    round: number,
    config: { batchSize: number; waitMs: number; radiusMetres: number },
  ) {
    const startedAt = Date.now();
    const expiresAt = startedAt + config.waitMs;

    const progress = {
      orderId: order._id.toString(),
      currentRound: round + 1,
      totalRounds: DISPATCH_ROUNDS.length,
      batchSize: config.batchSize,
      radiusMetres: config.radiusMetres,
      startedAt,
      expiresAt,
      waitMs: config.waitMs,
    };

    await redis.set(
      `dispatch:order:${order._id.toString()}:progress`,
      JSON.stringify(progress),
      "EX",
      10 * 60,
    );

    const vendorOwnerId = await this.resolveVendorOwnerId(order?.vendor?.toString());
    const customerId = order?.customer?.toString();

    if (vendorOwnerId) {
      emitToUser(req, vendorOwnerId, "dispatch_progress", progress);
    }

    if (customerId) {
      emitToUser(req, customerId, "dispatch_progress", progress);
    }
  }

  private async notifyDispatchExhausted(req: Request, order: any) {
    const customerId = order?.customer?.toString();
    const vendorId = order?.vendor?.toString();
    const vendorOwnerId = await this.resolveVendorOwnerId(vendorId);

    await redis.del(`dispatch:order:${order._id.toString()}:progress`);

    if (vendorOwnerId) {
      emitToUser(req, vendorOwnerId, "dispatch_exhausted", {
        orderId: order._id,
        orderNumber: order.orderNumber,
      });
    }

    if (customerId) {
      emitToUser(req, customerId, "dispatch_exhausted", {
        orderId: order._id,
        orderNumber: order.orderNumber,
      });
    }

    const admins = await UserModel.find({ role: "admin", status: "active" })
      .select("_id")
      .lean();

    admins.forEach((admin) => {
      emitToUser(req, admin._id.toString(), "dispatch_exhausted", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        vendorId,
      });
    });
  }

  private async getEligibleRiders(orderId: string, radiusMetres: number) {
    const order = await Order.findById(orderId).select("deliveryLocation").lean();
    if (!order) throw new AppError(404, "Order not found");

    const coordinates = order.deliveryLocation?.coordinates;
    if (!coordinates || coordinates.length < 2) {
      return [];
    }

    const [lng, lat] = coordinates;

    return Rider.findNearby(lng, lat, radiusMetres)
      .select("owner vehicle_type currentLocation status availability_status")
      .populate("owner", "firstName lastName phone")
      .lean();
  }

  private async runDispatchRound(
    req: Request,
    orderId: string,
    round: number,
  ): Promise<void> {
    const order = await Order.findById(orderId).lean();
    if (!order) return;
    if (order.status !== statusHistoryStates.ready || order.driver) return;

    const config = DISPATCH_ROUNDS[Math.min(round, DISPATCH_ROUNDS.length - 1)];
    const riders = await this.getEligibleRiders(orderId, config.radiusMetres);

    if (!riders.length) {
      const nextRound = round + 1;
      if (nextRound < DISPATCH_ROUNDS.length) {
        await this.runDispatchRound(req, orderId, nextRound);
        return;
      }
      await redis.set(`dispatch:order:${orderId}:exhausted`, "1", "EX", 60 * 60);
      await this.notifyDispatchExhausted(req, order);
      return;
    }

    const candidates = riders.slice(0, config.batchSize);

    await this.emitDispatchProgress(req, order, round, config);

    await redis.set(
      `dispatch:order:${orderId}:round`,
      JSON.stringify({ round, riderIds: candidates.map((r: any) => r._id.toString()) }),
      "EX",
      10 * 60,
    );

    await Promise.all(
      candidates.map(async (rider: any) => {
        const ownerId = rider?.owner?._id?.toString();
        if (!ownerId) return;

        emitToUser(req, ownerId, "dispatch_offer", {
          orderId: order._id,
          orderNumber: order.orderNumber,
          total: order.total,
          deliveryAddress: order.deliveryAddress?.formattedAddress,
          vendorId: order.vendor,
          expiresInMs: config.waitMs,
        });
      }),
    );

    setTimeout(async () => {
      const fresh = await Order.findById(orderId).select("status driver").lean();
      if (!fresh) return;
      if (fresh.status !== statusHistoryStates.ready || fresh.driver) return;

      const nextRound = round + 1;
      if (nextRound < DISPATCH_ROUNDS.length) {
        await this.runDispatchRound(req, orderId, nextRound);
        return;
      }

      await redis.set(`dispatch:order:${orderId}:exhausted`, "1", "EX", 60 * 60);
      await this.notifyDispatchExhausted(req, order);
    }, config.waitMs);
  }

  async dispatchOrderToRiders(req: Request, orderId: string) {
    await redis.del(`dispatch:order:${orderId}:exhausted`);
    await this.runDispatchRound(req, orderId, 0);
  }

  async vendorRetryDispatch(req: Request, user: IUserDocument, orderId: string) {
    const order = await Order.findById(orderId)
      .select("status driver vendor orderNumber")
      .lean();

    if (!order) {
      throw new AppError(404, "Order not found");
    }

    if (order.status !== statusHistoryStates.ready || order.driver) {
      throw new AppError(
        400,
        "Only ready and unassigned orders can be retried",
      );
    }

    const vendor = await Vendor.findOne({
      _id: order.vendor,
      owner: user._id.toString(),
    })
      .select("_id")
      .lean();

    if (!vendor) {
      throw new AppError(403, "You are not allowed to retry this order dispatch");
    }

    const cooldownKey = `dispatch:order:${orderId}:manual-retry-cooldown`;
    const retryCountKey = `dispatch:order:${orderId}:manual-retry-count`;

    const cooldownActive = await redis.get(cooldownKey);
    if (cooldownActive) {
      throw new AppError(
        429,
        "Retry cooldown active. Please wait about 1 minute before retrying again.",
      );
    }

    const retryCount = await redis.incr(retryCountKey);
    if (retryCount === 1) {
      await redis.expire(retryCountKey, MANUAL_RETRY_WINDOW_SECONDS);
    }

    if (retryCount > MANUAL_RETRY_MAX_PER_WINDOW) {
      await redis.set(cooldownKey, "1", "EX", 5 * 60);
      throw new AppError(
        429,
        "Maximum retry attempts reached. Please wait a few minutes before retrying.",
      );
    }

    await redis.set(cooldownKey, "1", "EX", MANUAL_RETRY_COOLDOWN_SECONDS);
    await this.dispatchOrderToRiders(req, orderId);

    await OrderStatusAudit.create({
      order: order._id,
      fromStatus: statusHistoryStates.ready,
      toStatus: statusHistoryStates.ready,
      actorUser: user._id,
      actorRole: user.role,
      source: "vendor_retry",
      meta: {
        retryCount,
      },
    });

    return {
      message: "Dispatch retry started successfully",
      orderId,
      retryCount,
      cooldownSeconds: MANUAL_RETRY_COOLDOWN_SECONDS,
    };
  }

  async handleValidateCheckoutOrder(
    user: IUserDocument,
    orderData: MJAddToCartItem[],
  ) {
    await validateCart(orderData);

    // 2. Build summary with fees per vendor
    const summary = await buildCheckoutSummary(orderData, user);

    const checkoutSessionId = `checkout_${user._id.toString()}_${Date.now()}`;

    await redis.set(
      `checkout:${checkoutSessionId}`,
      JSON.stringify({ summary, customerId: user._id.toString() }),
      "EX",
      60 * 60, // 1 hour expiration
    );

    return {
      summary,
      checkoutSessionId,
      message: "Checkout validated successfully",
    };
  }

  async getOrderDetails(user: IUserDocument, checkoutId: string) {
    if (!checkoutId.startsWith(`checkout_`)) {
      throw new AppError(400, "Invalid checkout ID");
    }

    const orders = await Order.find({
      checkoutSessionId: checkoutId,
      customer: user._id.toString(),
    })
      .populate("vendor", "name logo")
      .lean();

    if (!orders || orders.length === 0) {
      throw new AppError(404, "Order not found");
    }

    const sanitizedOrders = orders.map(sanitizeToId);

    const totalDeliveryFee = sanitizedOrders.reduce(
      (total, order) => total + (order.deliveryFee || 0),
      0,
    );

    const totalServiceFee = sanitizedOrders.reduce(
      (total, order) => total + (order.serviceFee || 0),
      0,
    );

    const subTotal = sanitizedOrders.reduce(
      (total, order) => total + (order.subtotal || 0),
      0,
    );

    const grandTotal = subTotal + totalDeliveryFee + totalServiceFee;

    const paymentType = orders[0]?.paymentMethod;

    const deliveryAddress = orders[0]?.deliveryAddress?.formattedAddress;

    return {
      orders: sanitizedOrders,
      totalDeliveryFee,
      totalServiceFee,
      grandTotal,
      paymentType,
      deliveryAddress,
      checkoutId,
    };
  }

  async getVendorOrders(user: IUserDocument, vendorId: string) {
    const orders = await Order.find({ vendor: vendorId })
      .populate("customer", "username phone firstName lastName")
      .populate({
        select: "vehicle_type",
        path: "driver",
        populate: {
          path: "owner",
          select: "firstName lastName phone",
        },
      })
      .lean();

    if (!orders || orders.length === 0) {
      throw new AppError(404, "No orders found for this vendor");
    }

    const exhaustedStatuses = await Promise.all(
      orders.map(async (order) => {
        const exhausted = await redis.get(
          `dispatch:order:${order._id.toString()}:exhausted`,
        );
        return [order._id.toString(), Boolean(exhausted)] as const;
      }),
    );

    const dispatchProgressEntries = await Promise.all(
      orders.map(async (order) => {
        const progress = await redis.get(
          `dispatch:order:${order._id.toString()}:progress`,
        );

        return [
          order._id.toString(),
          progress ? JSON.parse(progress) : null,
        ] as const;
      }),
    );

    const exhaustedMap = new Map(exhaustedStatuses);
    const progressMap = new Map(dispatchProgressEntries);

    const sanitizedOrders = orders.map(sanitizeToId).map((order) => {
      const driver = order.driver as any;

      return {
        ...order,
        dispatchExhausted: exhaustedMap.get(order._id?.toString()) || false,
        dispatchProgress: progressMap.get(order._id?.toString()) || null,
        driver: {
          ...driver,
          firstName: driver?.owner?.firstName,
          lastName: driver?.owner?.lastName,
          phone: driver?.owner?.phone,
          owner: undefined, // strip the nested object if not needed
        },
      };
    });

    return { orders: sanitizedOrders };
  }

  async updateOrderStatus(
    req: Request,
    user: IUserDocument,
    orderId: string,
    payload: TUpdateOrderStatusPayload,
  ) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError(404, "Order not found");
    }

    console.log("Updating order status:", payload, "for order ID:", orderId);

    const currentStatus = order.status as statusHistoryStates;
    const nextStatus = payload.status;
    const vendorAllowedNext = VENDOR_ALLOWED_TRANSITIONS[currentStatus] || [];

    if (!vendorAllowedNext.includes(nextStatus)) {
      throw new AppError(
        400,
        `Invalid vendor transition from ${currentStatus} to ${nextStatus}`,
      );
    }

    // Update the order's status and status history
    order.status = payload.status;
    order.statusHistory = [...order.statusHistory, ...payload.statusTimeline];

    // Optional updates
    if (payload.cancelledBy) {
      order.cancelledBy = payload.cancelledBy;
    }
    if (payload.cancellationReason) {
      order.cancellationReason = payload.cancellationReason;
    }
    if (payload.actualPrepTime !== undefined) {
      order.actualPrepTime = payload.actualPrepTime;
    }
    if (payload.prepTimeEstimate !== undefined) {
      order.prepTimeEstimate = payload.prepTimeEstimate;
    }
    if(payload.cancelledByUserId) {
      order.cancelledByUserId = payload.cancelledByUserId;
    }

    await order.save();

    await OrderStatusAudit.create({
      order: order._id,
      fromStatus: currentStatus,
      toStatus: nextStatus,
      actorUser: user._id,
      actorRole: user.role,
      source: "vendor_update",
      meta: {
        statusTimelineCount: payload.statusTimeline?.length || 0,
      },
    });

    if (payload.status === statusHistoryStates.ready) {
      await this.dispatchOrderToRiders(req, orderId);
    }

    if (payload.status === statusHistoryStates.cancelled) {
      await redis.del(`dispatch:order:${orderId}:progress`);
      await redis.del(`dispatch:order:${orderId}:exhausted`);
      await this.queueRefundForCancelledOrder(req, order, user);
    }

    return { message: "Order status updated successfully", order };
  }

  async adminProcessRefund(
    req: Request,
    user: IUserDocument,
    orderId: string,
    payload: TProcessRefundPayload,
  ) {
    const order = await Order.findById(orderId);
    if (!order) throw new AppError(404, "Order not found");

    if (order.status !== statusHistoryStates.cancelled) {
      throw new AppError(400, "Only cancelled orders can be refunded");
    }

    if (order.paymentStatus !== PAYMENT_STATUSES[1]) {
      throw new AppError(400, "Only paid orders are eligible for refunds");
    }

    const refundTx = await Transaction.findOne({
      order: order._id,
      type: "refund",
      status: { $in: ["pending", "failed", "success"] },
    }).sort({ createdAt: -1 });

    if (!refundTx) {
      throw new AppError(404, "Refund transaction not found");
    }

    const refundDoc = refundTx as any;

    if (payload.status === "success") {
      refundDoc.status = "success";
      refundDoc.reference = payload.refundReference || refundDoc.reference;
      await refundDoc.save();

      order.refundAmount = order.total;
      order.refundStatus = "success";
      order.refundReference = payload.refundReference || refundDoc.reference;
      order.refundProcessedAt = new Date();
      order.refundFailureReason = null;
      order.paymentStatus = PAYMENT_STATUSES[3]; // refunded
      order.status = statusHistoryStates.refunded;
      order.statusHistory = [
        ...order.statusHistory,
        {
          status: statusHistoryStates.refunded,
          timestamp: new Date(),
          updatedBy: user._id,
          updatedByUserRole: user.role,
        },
      ];

      await order.save();

      await OrderStatusAudit.create({
        order: order._id,
        fromStatus: statusHistoryStates.cancelled,
        toStatus: statusHistoryStates.refunded,
        actorUser: user._id,
        actorRole: user.role,
        source: "vendor_update",
        meta: {
          refundReference: order.refundReference,
          processedByAdmin: true,
        },
      });

      const customerId = order.customer?.toString();
      if (customerId) {
        emitToUser(req, customerId, "order_refunded", {
          orderId: order._id,
          orderNumber: order.orderNumber,
          amount: order.refundAmount,
          refundReference: order.refundReference,
        });
      }

      return { message: "Refund processed successfully", order };
    }

    refundDoc.status = "failed";
    refundDoc.metadata = {
      ...(refundDoc.metadata || {}),
      failureReason: payload.failureReason || "Refund processing failed",
      failedAt: new Date().toISOString(),
      failedBy: user._id.toString(),
    };
    await refundDoc.save();

    order.refundStatus = "failed";
    order.refundFailureReason = payload.failureReason || "Refund processing failed";
    await order.save();

    return { message: "Refund marked as failed", order };
  }

  async riderAcceptDispatch(req: Request, user: IUserDocument, orderId: string) {
    const rider = await Rider.findOne({ owner: user._id.toString() }).lean();
    if (!rider) throw new AppError(404, "Rider profile not found");

    const assignedOrder = await Order.findOneAndUpdate(
      {
        _id: orderId,
        status: statusHistoryStates.ready,
        driver: null,
      },
      {
        $set: {
          status: statusHistoryStates.assigned,
          driver: rider._id,
        },
        $push: {
          statusHistory: {
            status: statusHistoryStates.assigned,
            timestamp: new Date(),
            updatedBy: user._id,
            updatedByUserRole: user.role,
          },
        },
      },
      { new: true },
    )
      .populate("customer", "firstName lastName")
      .populate("vendor", "name owner")
      .lean();

    if (!assignedOrder) {
      throw new AppError(409, "Order already assigned to another rider");
    }

    await Rider.findByIdAndUpdate(rider._id, {
      availability_status: AvailabilityStatus.BUSY,
    });

    await redis.del(`dispatch:order:${orderId}:progress`);
    await redis.del(`dispatch:order:${orderId}:exhausted`);

    const customerId = (assignedOrder.customer as any)?._id?.toString();
    const vendorOwnerId = (assignedOrder.vendor as any)?.owner?.toString();

    if (customerId) {
      emitToUser(req, customerId, "order_assigned", {
        orderId: assignedOrder._id,
        orderNumber: assignedOrder.orderNumber,
      });
    }

    if (vendorOwnerId) {
      emitToUser(req, vendorOwnerId, "order_assigned", {
        orderId: assignedOrder._id,
        orderNumber: assignedOrder.orderNumber,
        riderId: rider._id,
      });
    }

    await OrderStatusAudit.create({
      order: assignedOrder._id,
      fromStatus: statusHistoryStates.ready,
      toStatus: statusHistoryStates.assigned,
      actorUser: user._id,
      actorRole: user.role,
      source: "dispatch_accept",
      meta: {
        riderId: rider._id,
      },
    });

    return { message: "Order accepted successfully", order: assignedOrder };
  }

  async riderUpdateDeliveryStatus(
    req: Request,
    user: IUserDocument,
    orderId: string,
    payload: Pick<TUpdateOrderStatusPayload, "status">,
  ) {
    const rider = await Rider.findOne({ owner: user._id.toString() });
    if (!rider) throw new AppError(404, "Rider profile not found");

    const order = await Order.findOne({ _id: orderId, driver: rider._id });
    if (!order) throw new AppError(404, "Order not found for this rider");

    const currentStatus = order.status as statusHistoryStates;
    const nextStatus = payload.status;
    const riderAllowedNext = RIDER_ALLOWED_TRANSITIONS[currentStatus] || [];

    if (!riderAllowedNext.includes(nextStatus)) {
      throw new AppError(
        400,
        `Invalid rider transition from ${currentStatus} to ${nextStatus}`,
      );
    }

    order.status = payload.status;
    order.statusHistory = [
      ...order.statusHistory,
      {
        status: payload.status,
        timestamp: new Date(),
        updatedBy: user._id,
        updatedByUserRole: user.role,
      },
    ];

    if (payload.status === statusHistoryStates.delivered) {
      order.actualDeliveryTime = new Date();
      rider.availability_status = AvailabilityStatus.ONLINE;
      rider.totalDeliveries += 1;
      await rider.save();
    }

    await order.save();

    await OrderStatusAudit.create({
      order: order._id,
      fromStatus: currentStatus,
      toStatus: nextStatus,
      actorUser: user._id,
      actorRole: user.role,
      source: "rider_update",
    });

    const populated = await Order.findById(order._id)
      .populate("customer", "firstName lastName")
      .populate("vendor", "name owner")
      .lean();

    const customerId = (populated?.customer as any)?._id?.toString();
    const vendorOwnerId = (populated?.vendor as any)?.owner?.toString();

    if (customerId) {
      emitToUser(req, customerId, "order_delivery_update", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
      });
    }

    if (vendorOwnerId) {
      emitToUser(req, vendorOwnerId, "order_delivery_update", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
      });
    }

    return { message: "Delivery status updated successfully", order: populated };
  }
}

const orderService = new OrderService();

export default orderService;
