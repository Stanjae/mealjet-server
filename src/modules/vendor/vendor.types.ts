import { IAddress } from "@modules/users/user.types";
import mongoose, { Document } from "mongoose";

export interface IOpeningHour {
  day: string; // 0 = Sunday, 6 = Saturday
  openTime: string; // "08:00"
  closeTime: string; // "22:00"
  isClosed: boolean;
}


export interface IBankDetails {
  bankName: string;
  bankCode?: string;
  accountNumber: string;
  accountName: string;
}

export interface ILocation {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

export interface IVendor extends Document {
  owner: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  cuisineTypes: string[];
  status: "pending_approval" | "active" | "suspended" | "closed";
  isOpen: boolean;
  logo: string;
  coverImage: string;
  address: IAddress;
  location: ILocation;
  phone: string;
  openingHours: IOpeningHour[];
  avgRating: number;
  totalRatings: number;
  avgPrepTime: number;
  minOrderAmount: number;
  deliveryFee: number;
  commissionRate: number;
  bankDetails: IBankDetails;
  totalOrders: number;
  isFeatured: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  proof_of_registration: string;
  proof_of_identification: string;
}

export type IVendorReqFiles = {
  [fieldname: string]: Express.Multer.File[];
};
