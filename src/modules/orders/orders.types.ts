import { IAddon } from "@modules/menus/menu.types";
import { IAddress, UserRole } from "@modules/users/user.types";
import { ILocation } from "@modules/vendor/vendor.types";
import {
  orderTypes,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  statusHistoryStates,
} from "@shared/constants/orders.constants";
import { Types } from "mongoose";

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
  status: (typeof statusHistoryStates)[number];
  timestamp: Date;
  updatedBy: Types.ObjectId;
  note: string;
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
  status: (typeof statusHistoryStates)[number];
  deliveryFee: number;
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
  promoCode?: string;
  customerNotes?: string | null;
  noteForDriver?: string | null;
  orderType: (typeof orderTypes)[number];
  currency: string;
  cancelledBy?: UserRole;
  cancellationReason?: string;
};
