import { IUserDocument } from "@modules/users/user.model";
import { MJAddToCartItem } from "./orders.types";
import { buildCheckoutSummary, sanitizeToId, validateCart } from "@shared/utils/helpers";
import { redis } from "@shared/config/redis";
import { AppError } from "@shared/middleware/error.middleware";
import Order from "./orders.model";

class OrderService {
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

    return { summary, checkoutSessionId, message: "Checkout validated successfully" };
  }

  async getOrderDetails(user: IUserDocument, checkoutId: string) {
    if(!checkoutId.startsWith(`checkout_`)) {
      throw new AppError(400, "Invalid checkout ID");
    }

    const orders = await Order.find({ checkoutSessionId: checkoutId, customer: user._id.toString() }).populate("vendor", "name logo").lean();

    if (!orders || orders.length === 0) {
      throw new AppError(404, "Order not found");
    }

    return orders.map(sanitizeToId);
  }
}

const orderService = new OrderService();

export default orderService;
