import { Document, Types } from "mongoose";

export interface IAddonOption {
  label: string;
  extraPrice: number;
  isAvailable: boolean;
  quantity?: number;
}

export interface IAddon {
  name: string;
  options: IAddonOption[];
  required: boolean;
  maxSelect: number;
  minSelect: number;
}

export interface IMenuItem extends Document {
  vendor: Types.ObjectId;
  category: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountPrice?: number;
  image: string;
  images: string[];
  isAvailable: boolean;
  isPopular: boolean;
  isFeatured: boolean;
  prepTime: number;
  calories?: number;
  allergens: string[];
  addons: IAddon[];
  tags: string[];
  orderCount: number;
  rating: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type IMenuReqFiles = {
  [fieldname: string]: Express.Multer.File[];
};
