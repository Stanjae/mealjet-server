import { authenticate, authorize } from "@shared/middleware/auth.middleware";
import { Router } from "express";
import * as orderController from "./orders.controllers";

const router = Router();
// Checkout order
router.post("/check-out", authenticate, authorize("customer"), orderController.handleValidateCheckoutOrder);

// Fetches order details by orderId
router.get("/get-order-details-by-id/:orderId", authenticate, authorize("customer"), orderController.getOrderDetailsById);

// Fetches order details by checkoutId
router.get("/get-order-details/:checkoutId", authenticate, authorize("customer"), orderController.getOrderDetails);

//fetches customer order history
router.get("/get-customer-orders", authenticate, authorize("customer"), orderController.getCustomerOrders);

//fetches customer order history summary
router.get("/get-customer-orders-summary", authenticate, authorize("customer"), orderController.getCustomerOrdersSummary);

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

//revalidates checkout session for a given orderId and returns updated summary
router.get(
	"/revalidate-checkout-session/:orderId",
	authenticate,
	authorize("customer"),
	orderController.revalidateCheckoutSession,
);


export default router;