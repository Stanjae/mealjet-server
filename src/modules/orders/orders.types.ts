import { UserRole } from "@shared/types/enums";
import {
  orderTypes,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  REFUND_STATUSES,
  statusHistoryStates,
} from "@shared/constants/orders.constants";
import { ILocation } from "@shared/models/shared.types";
import { Types } from "mongoose";
import { IAddress } from "@modules/users";
import { IAddon } from "@modules/menus";

export type MJAddToCartItem = {
  title: string;
  id: string;
  quantity: number;
  price: number;
  imageUrl: string;
  totalQuantity: number;
  addons?: IAddon[];
  vendorId: string;
  vendorName: string;
  vendorImage: string;
  vendorSlug: string;
  vendorLocation: ILocation;
  vendorDeliveryFee: number;
};

export type ICheckoutSummary = {
  vendorId: string;
  vendorImage: string;
  vendorName: string;
  vendorSlug: string;
  vendorDeliveryFee: number;
  vendorLocation: ILocation;
  calculatedDistanceKm: string;
  calculatedSubtotal: number;
  items: MJAddToCartItem[];
  total: number;
  serviceCharge: number;
  deliveryAddress: IAddress;
  deliveryLocation: ILocation;
};

export type IFullCheckoutSummary = {
  summary: {
    newCart: ICheckoutSummary[];
    grandTotal: number;
    totalServiceCharge: number;
    totalSubtotal: number;
    totalDeliveryFee: number;
  };
  checkoutSessionId: string;
};
export type IStatusHistory = {
  status: statusHistoryStates;
  timestamp: Date;
  updatedBy: Types.ObjectId;
  updatedByUserRole?: UserRole; // optional, user role of who triggered the change
};

export type IItemSnapshot = {
  menuItem: Types.ObjectId;
  name: string;
  imageUrl: string;
  price: number; // price at time of order
  quantity: number;
  addons: [
    {
      name: string;
      price: number;
    },
  ];
  subtotal: number; // (price + addons) * quantity
};

export type IOrder = {
  orderNumber: string;
  checkoutSessionId: string;
  customer: Types.ObjectId;
  vendor: Types.ObjectId;
  driver: Types.ObjectId;
  status: statusHistoryStates;
  deliveryFee: number;
  prepTimeEstimate: number | null;
  actualPrepTime: number | null;
  deliveryProof: string;
  estimatedDeliveryTime: Date | null;
  totalMinutesToDelivery: number | null;
  actualDeliveryTime: Date | null;
  driverRating: number | null;
  vendorRating: number | null;
  statusHistory: IStatusHistory[];
  items: MJAddToCartItem[];
  deliveryAddress: IAddress;
  calculatedDistanceKm: number;
  deliveryLocation?: ILocation;
  subtotal: number; // sum of all vendor subtotals
  serviceFee: number;
  discount?: number;
  total: number;
  paymentMethod: (typeof PAYMENT_METHODS)[number];
  paymentStatus: (typeof PAYMENT_STATUSES)[number];
  paymentReference: string; // some payments might not have this
  refundAmount?: number;
  refundStatus?: (typeof REFUND_STATUSES)[number];
  refundReference?: string | null;
  refundProcessedAt?: Date | null;
  refundFailureReason?: string | null;
  promoCode?: string;
  customerNotes?: string | null;
  noteForDriver?: string | null;
  orderType: (typeof orderTypes)[number];
  currency: string;
  cancelledBy?: UserRole;
  cancelledByUserId?: string;
  cancellationReason?: string;
};

export type TUpdateOrderStatusPayload = {
  status: statusHistoryStates;
  statusTimeline: IStatusHistory[];
  cancelledBy?: UserRole;
  cancellationReason?: string | null;
  actualPrepTime?: number;
  prepTimeEstimate?: number;
  cancelledByUserId?: string;
};

export type TProcessRefundPayload = {
  status: "success" | "failed";
  refundReference?: string;
  failureReason?: string;
};

export type TMarkOrderAsReadyPayload = {
  actualPrepTime?: number;
  vendorId: string;
};
