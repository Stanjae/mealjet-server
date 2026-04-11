import { env } from "@shared/config/env";
import crypto from "crypto";
import { Request, Response } from "express";
import paymentService from "../payment.service";

export const handlePaystackWebhook = async (req: Request, res: Response) => {
  const hash = crypto
    .createHmac("sha512", env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"]) {
    return res.status(401).send("Invalid signature");
  }

  // STEP B: Respond to Paystack immediately (within 5 seconds)
  res.sendStatus(200);

  // STEP C: Process the event asynchronously
  const { event, data } = req.body;

  if (event === "charge.success") {
    await paymentService.handlePaymentSuccess(req, data);
  }

  if (event === "charge.failed") {
    await paymentService.handlePaymentFailed(req, data);
  }
};
