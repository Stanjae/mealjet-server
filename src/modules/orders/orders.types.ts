import { IAddon } from "@modules/menus/menu.types";
import { ILocation } from "@modules/vendor/vendor.types";

export type MJAddToCartItem = {
  title: string;
  id: string;
  quantity: number;
  price: number;
  imageUrl: string;
  totalQuantity: number;
  addons?:IAddon[];
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