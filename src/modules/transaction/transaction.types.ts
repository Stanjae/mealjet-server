import { PAYMENT_METHODS } from "@shared/constants/orders.constants";
import { Types } from "mongoose";

export type ITransaction = {
	reference: string;
	order: Types.ObjectId[];
	user: Types.ObjectId;
	type:
		| "payment"
		| "refund"
		| "driver_payout"
		| "platform_commission"
		| "wallet_topup";
	amount: number;
	currency: string;
	status: "pending" | "success" | "failed";
	gateway?: (typeof PAYMENT_METHODS)[number];
	gatewayResponse?: unknown;
	metadata?: Record<string, unknown>;
	createdAt?: Date;
};