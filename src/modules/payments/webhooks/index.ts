import { env } from "@shared/config/env";
import crypto from "crypto";
import { Request, Response } from "express";
import paymentService from "../payment.service";
import { logger } from "@shared/utils/logger";

export const handlePaystackWebhook = async (req: Request, res: Response) => {
  const hash = crypto
    .createHmac("sha512", env.PAYSTACK_SECRET_KEY)
    .update(req.body)
    .digest("hex");

  console.log("Received Paystack webhook, verifying signature...", hash);

  if (hash !== req.headers["x-paystack-signature"]) {
    console.log("Invalid Paystack webhook signature");
    return res.status(401).send("Invalid signature");
  }

  // STEP B: Respond to Paystack immediately (within 5 seconds)
  console.log(
    "Received webhook from Paystack, responding with 200 OK",
    req.headers,
  );
  res.sendStatus(200);

  // STEP C: Process the event asynchronously
  const { event, data } = JSON.parse(req.body.toString());

  try {
    if (event === "charge.success") {
      console.log("Received charge.success webhook from Paystack");
      await paymentService.handlePaymentSuccess(req, data);
    }

    if (event === "charge.failed") {
      console.log("Received charge.failed webhook from Paystack");
      await paymentService.handlePaymentFailed(req, data);
    }
  } catch (err) {
    logger.error(err);
    console.log("an error occurred", err);
  }
};
