import { IUserDocument } from "@modules/users/user.model";
import { TInitializePaymentPayload } from "./payment.types";
import { redis } from "@shared/config/redis";
import { AppError } from "@shared/middleware/error.middleware";
import { getPaymentProvider } from "./utils/getPaymentProvider";
import { IFullCheckoutSummary } from "@modules/orders/orders.types";

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

    const authorizationUrl = await paymentProvider?.initializePayment(user, Math.floor(Number(summary.grandTotal)), checkoutSessionId);

    return { authorizationUrl, checkoutSessionId, paymentMethod, message: "Payment initialized successfully" };
  }
}

const paymentService = new PaymentService();

export default paymentService;
