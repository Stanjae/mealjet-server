import mongoose from "mongoose";

export interface IMenuCategory extends mongoose.Document {
  vendorId: mongoose.Types.ObjectId;
  name: string;
  isVisible: boolean;
  logo: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  itemCount: number;
}

export type TCreateMeuCategoryPayload = {
  name: string;
  vendorId: string;
  id?: string;
  isVisible?: boolean;
};
