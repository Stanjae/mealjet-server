import { env } from "@shared/config/env";
import { TInitializePaymentProviderPayload } from "../payment.types";

const paystackService = {
  initializePayment: async ({
    customer,
    grandTotal,
    checkoutSessionId,
    noteForRider,
    noteForVendor,
    paymentMethod,
  }: TInitializePaymentProviderPayload) => {
    const res = await fetch(`${env.PAYSTACK_API_URL}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: customer.email,
        amount: grandTotal * 100, // Paystack uses kobo
        reference: checkoutSessionId,
        metadata: {
          customerId: customer._id,
          checkoutSessionId,
          noteForRider,
          noteForVendor,
          paymentMethod,
        },
      }),
    });

    const data = await res.json();
    return {
      paymentUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
    };
  },
};

export default paystackService;
