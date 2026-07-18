import { TPaymentMenthod } from "../payment.types";
import paystackService from "../providers/paystack";
import walletService from "../providers/wallet";

export const getPaymentProvider = (paymentMethod: TPaymentMenthod) => {
  switch (paymentMethod) {
    case "wallet":
      return walletService;
    case "paystack":
      return paystackService;
    default:
      return paystackService;
  }
};
