import { USER_ROLES } from "@shared/constants/auth.constants";
import {
  orderTypes,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  REFUND_STATUSES,
  statusHistoryStates,
} from "@shared/constants/orders.constants";
import { model, Schema } from "mongoose";
import { IOrder } from "./orders.types";
import { addressSchema } from "@shared/models/shared.models";

const statusHistorySchema = new Schema(
  {
    status: { type: String, enum: Object.values(statusHistoryStates) },
    timestamp: { type: Date, default: Date.now },
    updatedBy: { type: String }, // who triggered the change
    updatedByUserRole: { type: String, enum: USER_ROLES }, // optional, user role of who triggered the change
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, unique: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: "User" },
    checkoutSessionId: { type: String, index: true },
    vendor: { type: Schema.Types.ObjectId, ref: "Vendor" },
    driver: { type: Schema.Types.ObjectId, ref: "Rider", default: null },
    status: {
      type: String,
      enum: Object.values(statusHistoryStates),
      default: statusHistoryStates.pending,
    },
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
    prepTimeEstimate: { type: Number, min: 0, default: null },
    actualPrepTime: { type: Number, min: 0, default: null },
    estimatedDeliveryTime: { type: Date, default: null },
    totalMinutesToDelivery: { type: Number, default: null }, // in minutes
    actualDeliveryTime: { type: Date, default: null },
    deliveryProof: { type: String, default: null },
    driverRating: { type: Number, default: null },
    vendorRating: { type: Number, default: null },
    calculatedDistanceKm: { type: Number, default: null }, // for internal use, not saved to DB
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
    refundStatus: {
      type: String,
      enum: REFUND_STATUSES,
      default: "none",
      index: true,
    },
    refundReference: { type: String, default: null },
    refundProcessedAt: { type: Date, default: null },
    refundFailureReason: { type: String, default: null },

    promoCode: { type: String, default: null },
    customerNotes: { type: String, default: null },
    noteForDriver: { type: String, default: null },
    orderType: { type: String, enum: orderTypes, default: "delivery" },
    currency: { type: String, default: "NGN" },

    cancelledBy: {
      type: String,
      enum: USER_ROLES,
    },
    cancelledByUserId: { type: String, default: null }, // optional, user role of who triggered the change
    cancellationReason: { type: String, default: null },
  },
  { timestamps: true },
);

const Order = model("Order", orderSchema);
export default Order;
