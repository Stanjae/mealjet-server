import { TPaymentMenthod } from "../payment.types";
import paystackService from "../providers/paystack";

export const getPaymentProvider = (paymentMethod: TPaymentMenthod) => {
    switch (paymentMethod) {
        case 'wallet':
            return paystackService
        case 'bank_transfer':
            return paystackService
        default:
            return paystackService
    }
}