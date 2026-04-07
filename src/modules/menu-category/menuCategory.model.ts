import { model, Schema } from "mongoose";
import { IMenuCategory } from "./menuCategory.types";

const menuCategorySchema = new Schema<IMenuCategory>(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    itemCount: { type: Number, default: 0 },
    name: {
      type: String,
      required: true,
      trim: true,
      index: "text", // text index for search
    },

    isVisible: {
      type: Boolean,
      default: false,
    },

    logo: {
      type: String,
      required: false,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const MenuCategory = model<IMenuCategory>("MenuCategory", menuCategorySchema);

export default MenuCategory;
