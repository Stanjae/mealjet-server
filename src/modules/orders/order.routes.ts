import { authenticate, authorize } from "@shared/middleware/auth.middleware";
import { Router } from "express";
import * as orderController from "./orders.controllers";

const router = Router();

router.post("/check-out", authenticate, authorize("customer"), orderController.handleValidateCheckoutOrder);

router.get("/get-order-details/:checkoutId", authenticate, authorize("customer"), orderController.getOrderDetails);

// Fetches all orders assigned to a vendor
router.get("/get-vendor-orders/:vendorId", authenticate, authorize("vendor"), orderController.getVendorOrders);


//update order status by orderId
router.patch("/update-order-status/:orderId/status", authenticate, authorize("vendor"), orderController.updateOrderStatus);

// vendor manually retries rider dispatch for ready+unassigned order
router.patch(
	"/vendor/retry-dispatch/:orderId",
	authenticate,
	authorize("vendor"),
	orderController.vendorRetryDispatch,
);

// admin processes queued refund for cancelled order
router.patch(
	"/admin/process-refund/:orderId",
	authenticate,
	authorize("admin"),
	orderController.adminProcessRefund,
);

// rider accepts dispatch offer
router.patch(
	"/rider/accept-dispatch/:orderId",
	authenticate,
	authorize("rider"),
	orderController.riderAcceptDispatch,
);

// rider updates in-delivery statuses
router.patch(
	"/rider/update-delivery-status/:orderId",
	authenticate,
	authorize("rider"),
	orderController.riderUpdateDeliveryStatus,
);


export default router;