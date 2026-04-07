import { IUserDocument } from "@modules/users/user.model";
import { env } from "@shared/config/env";
import { access } from "node:fs";

const paystackService = {
  initializePayment: async (customer:IUserDocument, grandTotal: number, checkoutSessionId:string) => {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: customer.email,
        amount: grandTotal * 100, // Paystack uses kobo
        reference: checkoutSessionId, // tie payment to checkout session
        metadata: {
          customerId: customer._id,
          checkoutSessionId,
        },
      }),
    });

    const data = await res.json();
    console.log("Paystack initialize response:", data);
    return {paymentUrl:data.data.authorization_url, accessCode:data.data.access_code}; // redirect customer here to pay
  },
};

export default paystackService;
