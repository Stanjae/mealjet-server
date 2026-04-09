import { model, Schema } from "mongoose";
import { ITransaction } from "./transaction.types";
import { PAYMENT_METHODS } from "@shared/constants/orders.constants";

const transactionSchema = new Schema<ITransaction>({
  reference: { type: String, unique: true },
  order: { type: Schema.Types.ObjectId, ref: "Order" },
  user: { type: Schema.Types.ObjectId, ref: "User" },
  type: {
    type: String,
    enum: [
      "payment",
      "refund",
      "driver_payout",
      "platform_commission",
      "wallet_topup",
    ],
  },
  amount: { type: Number },
  currency: { type: String, default: "NGN" },
  status: { type: String, enum: ["pending", "success", "failed"] },
  gateway: { type: String, enum: PAYMENT_METHODS },
  gatewayResponse: { type: Object },
  metadata: { type: Object },
  createdAt: { type: Date },
});

const Transaction = model("Transaction", transactionSchema);
export default Transaction;
