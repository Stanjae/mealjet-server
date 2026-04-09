import { Router, raw } from "express";
import * as paymentController from "./payment.controller";
import { authenticate } from "@shared/middleware/auth.middleware";
import * as paymentWebhooks from "./webhooks";

const router = Router();

router.post("/initialize", authenticate, paymentController.initializePayment);

router.post(
  "/webhook/paystack",
  raw({ type: "application/json" }),
  paymentWebhooks.handlePaystackWebhook,
);

export default router;
