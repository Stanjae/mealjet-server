import { IUserDocument, userService } from "@modules/users";
import {
  IFullCheckoutSummary,
  MJAddToCartItem,
  TMarkOrderAsReadyPayload,
  TUpdateOrderStatusPayload,
} from "./orders.types";
import {
  buildCheckoutSummary,
  calculateEstimatedDelivery,
  generateOrderNumber,
  sanitizeToId,
  validateCart,
} from "@shared/utils/helpers";
import { redis } from "@shared/config/redis";
import { AppError } from "@shared/middleware/error.middleware";
import Order from "./orders.model";
import { Request } from "express";
import { emitToUser } from "@shared/utils/socket.io";
import {
  AvailabilityStatus,
  DispatchStatus,
  UserRole,
} from "@shared/types/enums";
import {
  PAYMENT_STATUSES,
  statusHistoryStates,
} from "@shared/constants/orders.constants";
import OrderStatusAudit from "./order-status-audit.model";
import { riderService } from "@modules/rider";
import { transactionService } from "@modules/transaction";
import { vendorService } from "@modules/vendor";
import { menuService } from "@modules/menus";
import { DispatchEvents } from "@modules/dispatch";
import mongoose from "mongoose";
import { eventHandler } from "@shared/events/event";

const VENDOR_ALLOWED_TRANSITIONS: Partial<
  Record<statusHistoryStates, statusHistoryStates[]>
> = {
  [statusHistoryStates.pending]: [
    statusHistoryStates.preparing,
    statusHistoryStates.cancelled,
  ],
  [statusHistoryStates.confirmed]: [
    statusHistoryStates.preparing,
    statusHistoryStates.cancelled,
  ],
  [statusHistoryStates.preparing]: [
    statusHistoryStates.ready,
    statusHistoryStates.cancelled,
  ],
  [statusHistoryStates.ready]: [statusHistoryStates.cancelled],
};

const RIDER_ALLOWED_TRANSITIONS: Partial<
  Record<statusHistoryStates, statusHistoryStates[]>
> = {
  [statusHistoryStates.assigned]: [statusHistoryStates.picked_up],
  [statusHistoryStates.picked_up]: [statusHistoryStates.on_the_way],
  [statusHistoryStates.on_the_way]: [statusHistoryStates.delivered],
};

class OrderService {
  private eventBus = eventHandler;
  order() {
    return Order;
  }
  async handleValidateCheckoutOrder(
    user: IUserDocument,
    orderData: MJAddToCartItem[],
  ) {
    const { errors: cartErrors } = await validateCart(orderData);
    if (cartErrors.length) {
      throw new AppError(422, cartErrors.join(", "));
    }

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

  async getOrderDetailsById(user: IUserDocument, orderId: string) {
    const order = await Order.findById({
      _id: orderId,
      customer: user._id.toString(),
    }).populate("vendor", "name logo slug");

    if (!order) {
      throw new AppError(404, "Order not found");
    }

    const sanitizedOrder = sanitizeToId(order);

    return {
      order: sanitizedOrder,
      message: "Order details retrieved successfully",
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
    if (payload.cancelledByUserId) {
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

    const customerId = order.customer?.toString();
    if (customerId) {
      emitToUser(req, customerId, "order_update_to_customer", {
        status: payload.status,
        orderId: order._id,
      });
    }

    return { message: "Order status updated successfully", order };
  }

  //get customer orders
  async getCustomerOrders(
    user: IUserDocument,
    query: Record<string, string | undefined>,
  ) {
    const { search, category } = query;

    const validCategories = {
      ongoing: [
        statusHistoryStates.assigned,
        statusHistoryStates.picked_up,
        statusHistoryStates.on_the_way,
        statusHistoryStates.pending,
        statusHistoryStates.confirmed,
        statusHistoryStates.preparing,
        statusHistoryStates.ready,
      ],
      completed: [
        statusHistoryStates.delivered,
        statusHistoryStates.cancelled,
        statusHistoryStates.refunded,
      ],
    };

    const filter: { [key: string]: any } = { customer: user._id.toString() };

    if (search?.trim()) {
      const escapedSearch = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter["$or"] = [
        { orderNumber: { $regex: escapedSearch, $options: "i" } },
        { "items.title": { $regex: escapedSearch, $options: "i" } },
        //{ cancellationReason: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    if (category) {
      filter["status"] = {
        $in: validCategories[category as keyof typeof validCategories] || [],
      };
    }
    const orders = await Order.find(filter)
      .populate("vendor", "name logo slug")
      .sort({ createdAt: -1 })
      .lean();

    const sanitizedOrders = orders.map(sanitizeToId);

    return {
      message: "Customer orders retrieved successfully",
      orders: sanitizedOrders,
    };
  }

  //get customer orders summary
  async getCustomerOrdersSummary(user: IUserDocument) {
    const validCategories = {
      ongoing: [
        statusHistoryStates.assigned,
        statusHistoryStates.picked_up,
        statusHistoryStates.on_the_way,
        statusHistoryStates.pending,
        statusHistoryStates.confirmed,
        statusHistoryStates.preparing,
        statusHistoryStates.ready,
      ],
      completed: [
        statusHistoryStates.delivered,
        statusHistoryStates.cancelled,
        statusHistoryStates.refunded,
      ],
    };

    const ongoingCount = await Order.countDocuments({
      customer: user._id.toString(),
      status: { $in: validCategories.ongoing },
    });

    const completedCount = await Order.countDocuments({
      customer: user._id.toString(),
      status: { $in: validCategories.completed },
    });

    const deliveredCount = await Order.countDocuments({
      customer: user._id.toString(),
      status: statusHistoryStates.delivered,
    });

    const totalAmountSpent = await Order.aggregate([
      {
        $match: {
          customer: user._id.toString(),
          status: statusHistoryStates.delivered,
        },
      },
      { $group: { _id: null, totalSpent: { $sum: "$total" } } },
    ]);

    const averageAmountPerOrder = totalAmountSpent.length
      ? totalAmountSpent[0].totalSpent / deliveredCount
      : 0;

    return {
      message: "Customer orders summary retrieved successfully",
      summary: {
        ongoing: ongoingCount,
        completed: completedCount,
        allCount: ongoingCount + completedCount,
        delivered: deliveredCount,
      },
      totalAmountSpent: totalAmountSpent.length
        ? totalAmountSpent[0].totalSpent
        : 0,
      averageAmountPerOrder,
    };
  }

  //revalidate checkout order
  async createPaidOrdersFromCheckout(
    summary: IFullCheckoutSummary["summary"],
    checkoutSessionId: string,
    customerId: string,
    paymentReference: string,
    paymentMethod: string,
    noteForRider?: string,
    noteForVendor?: string,
  ) {
    const user = await userService.user().findById(customerId);
    if (!user) {
      throw new AppError(404, "Customer not found");
    }

    return Promise.all(
      summary.newCart.map(async (vendor, index) => {
        const orderNumber = await generateOrderNumber();

        const vendorData = await vendorService
          .vendor()
          .findById(vendor.vendorId);
        const vendorAvgPrep = vendorData?.avgPrepTime ?? 15;

        const menuIds = vendor.items.map((item) => item.id);
        const menuDocs = await menuService
          .menu()
          .find({ _id: { $in: menuIds } })
          .select("_id prepTime")
          .lean();

        const prepByMenuId = new Map(
          menuDocs.map((menu) => [menu._id.toString(), menu.prepTime]),
        );

        const totalQty =
          vendor.items.reduce(
            (acc, item) => acc + Number(item.quantity || 0),
            0,
          ) || 1;

        const weightedItemPrep =
          vendor.items.reduce((acc, item) => {
            const itemPrep = prepByMenuId.get(item.id) ?? vendorAvgPrep;
            return acc + itemPrep * Number(item.quantity || 1);
          }, 0) / totalQty;

        const maxItemPrep = vendor.items.reduce((max, item) => {
          const itemPrep = prepByMenuId.get(item.id) ?? vendorAvgPrep;
          return Math.max(max, itemPrep);
        }, 0);

        const complexityPenalty = Math.max(vendor.items.length - 1, 0) * 1.5;

        const orderPrepMins = Math.max(
          vendorAvgPrep,
          Math.round(
            0.6 * weightedItemPrep + 0.4 * maxItemPrep + complexityPenalty,
          ),
        );

        const newEta = calculateEstimatedDelivery(
          Number(vendor?.calculatedDistanceKm),
          orderPrepMins,
        );

        return Order.create({
          orderNumber,
          checkoutSessionId,
          customer: customerId,
          vendor: vendor.vendorId,
          items: vendor.items,
          status: "pending",
          statusHistory: [
            {
              status: "pending",
              timestamp: new Date(),
              updatedBy: customerId,
              updatedByUserRole: "customer",
            },
          ],
          deliveryAddress: user.toObject().currentAddress,
          calculatedDistanceKm: Number(vendor.calculatedDistanceKm),
          deliveryLocation: user.toObject().location,
          subtotal: vendor.calculatedSubtotal,
          deliveryFee: vendor.vendorDeliveryFee,
          prepTimeEstimate: orderPrepMins,
          serviceFee: vendor.serviceCharge,
          total: vendor.total,
          paymentStatus: "paid",
          paymentMethod,
          paymentReference: `${paymentReference}-${index}`,
          currency: "NGN",
          orderType: "delivery",
          promoCode: "",
          customerNotes: noteForVendor || "",
          noteForDriver: noteForRider || "",
          discount: 0,
          estimatedDeliveryTime: newEta.eta,
          totalMinutesToDelivery: newEta.totalMinutes,
          actualDeliveryTime: null,
        });
      }),
    );
  }

  async revalidateCheckoutSession(user: IUserDocument, orderId: string) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError(404, "Order not found");
    }

    const sanitizedOrder = sanitizeToId(order);

    const { errors: cartErrors, detailedErrors: cartDetailedErrors } =
      await validateCart(order.items);

    return {
      order: sanitizedOrder,
      cartErrors,
      cartDetailedErrors,
      message: "Checkout revalidated successfully",
    };
  }

  async markOrderAsReady(orderId: string, payload: TMarkOrderAsReadyPayload) {
    const session = await mongoose.startSession();

    session.startTransaction();
    try {
      const order = await this.order().findById(orderId);
      if (!order) {
        throw new AppError(404, "Order not found");
      }
      const vendor = await vendorService.vendor().findById(order.vendor);
      if (!vendor) {
        throw new AppError(404, "Vendor not found");
      }
      if (order.status !== statusHistoryStates.preparing) {
        throw new AppError(
          400,
          `Cannot mark order as ready. Current status is ${order.status}`,
        );
      }
      order.status = statusHistoryStates.ready;
      order.statusHistory.push({
        status: statusHistoryStates.ready,
        timestamp: new Date(),
        updatedBy: vendor._id,
        updatedByUserRole: UserRole.VENDOR,
      });
      if (payload.actualPrepTime !== undefined) {
        order.actualPrepTime = payload.actualPrepTime;
      }
      await order.save({ session });
      await session.commitTransaction();
      this.eventBus.emit(DispatchEvents.STARTED, {
        orderId: order._id.toString(),
      });
    } catch (error) {
      await session.abortTransaction();
      throw new AppError(500, "Failed to mark order as ready");
    } finally {
      session.endSession();
    }

    return { message: "Order marked as ready successfully" };
  }
}
const orderService = new OrderService();

export default orderService;
