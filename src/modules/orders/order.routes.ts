import { authenticate, authorize } from "@shared/middleware/auth.middleware";
import { Router } from "express";
import * as orderController from "./orders.controllers";

const router = Router();

router.post("/check-out", authenticate, authorize("customer"), orderController.handleValidateCheckoutOrder)


export default router;