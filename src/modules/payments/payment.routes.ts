import { Router } from "express"
import * as paymentController from "./payment.controller";
import { authenticate } from "@shared/middleware/auth.middleware";

const router = Router()

router.post("/initialize", authenticate, paymentController.initializePayment)

export default router