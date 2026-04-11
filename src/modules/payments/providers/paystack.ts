import { IUserDocument } from "@modules/users/user.model";
import { env } from "@shared/config/env";

const paystackService = {
  initializePayment: async (
    customer: IUserDocument,
    grandTotal: number,
    checkoutSessionId: string,
    noteForRider: string,
    noteForVendor: string,
  ) => {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
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
