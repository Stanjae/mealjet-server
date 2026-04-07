import { IUserDocument } from "@modules/users/user.model";
import { MJAddToCartItem } from "./orders.types";
import { buildCheckoutSummary, validateCart } from "@shared/utils/helpers";
import { redis } from "@shared/config/redis";

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
}

const orderService = new OrderService();

export default orderService;
