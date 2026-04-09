import { addressSchema } from "@modules/users/user.model";
import { USER_ROLES } from "@shared/constants/auth.constants";
import {
  orderTypes,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  statusHistoryStates,
} from "@shared/constants/orders.constants";
import { model, Schema } from "mongoose";
import { IOrder } from "./orders.types";

const statusHistorySchema = new Schema(
  {
    status: { type: String, enum: statusHistoryStates },
    timestamp: { type: Date, default: Date.now },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" }, // who triggered the change
    note: { type: String }, // optional e.g "rider called customer"
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, unique: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: "User" },
    checkoutSessionId: { type: String, index: true },
    vendor: { type: Schema.Types.ObjectId, ref: "Vendor" },
    driver: { type: Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: statusHistoryStates, default: "pending" },
    items: [{ type: Schema.Types.Mixed }],
    statusHistory: [statusHistorySchema],
    subtotal: {
      type: Number,
      min: 0,
      default: null,
    },
    deliveryFee: {
      type: Number,
      min: 0,
      default: null,
    },
    estimatedDeliveryTime: { type: Date, default: null },
    actualDeliveryTime: { type: Date, default: null },
    deliveryProof: { type: String, default: null },
    driverRating: { type: Number, default: null },
    vendorRating: { type: Number, default: null },

    deliveryAddress: addressSchema,
    deliveryLocation: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },
    serviceFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },

    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
    },
    paymentReference: { type: String, unique: true, sparse: true }, // some payments might not have this
    refundAmount: { type: Number, default: 0, optional: true },

    promoCode: { type: String, default: null },
    customerNotes: { type: String, default: null },
    orderType: { type: String, enum: orderTypes, default: "delivery" },
    currency: { type: String, default: "NGN" },

    cancelledBy: {
      type: String,
      enum: USER_ROLES,
    },
    cancellationReason: { type: String, default: null },
  },
  { timestamps: true },
);

const Order = model("Order", orderSchema);
export default Order;
