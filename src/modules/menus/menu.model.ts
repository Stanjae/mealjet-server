import mongoose, { Schema } from "mongoose";
import { IMenuItem } from "./menu.types";
import { menuAllergens, menuItemsTags } from "@shared/constants/menu.constants";
import MenuCategory from "@modules/menu-category/menuCategory.model";

const AddonOptionSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    extraPrice: { type: Number, required: true, min: 0, default: 0 },
    isAvailable: { type: Boolean, default: true },
  },
  { _id: false },
);

const AddonSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    options: { type: [AddonOptionSchema], required: true },
    required: { type: Boolean, default: false },
    maxSelect: { type: Number, default: 1, min: 1 },
    minSelect: { type: Number, default: 0 },
  },
  { _id: false },
);

const MenuItemSchema = new Schema<IMenuItem>(
  {
    vendor: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "MenuCategory",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPrice: {
      type: Number,
      min: 0,
      default: null,
    },
    image: {
      type: String,
      trim: true,
      default: "",
    },
    images: {
      type: [String],
      default: [],
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    prepTime: {
      type: Number,
      required: true,
      min: 0,
    },
    calories: {
      type: Number,
      min: 0,
      default: null,
    },
    allergens: {
      type: [String],
      enum: [...menuAllergens],
      default: [],
    },
    addons: {
      type: [AddonSchema],
      default: [],
    },
    tags: {
      type: [String],
      enum: [...menuItemsTags],
      default: [],
    },
    orderCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ─── Indexes ─────────────────────────────────────────────────────────────────

MenuItemSchema.index({ name: "text", description: "text", tags: "text" }); // full-text search
MenuItemSchema.index({ vendor: 1, category: 1 }); // scoped menu listing
MenuItemSchema.index({ vendor: 1, isAvailable: 1 }); // filter available items
MenuItemSchema.index({ vendor: 1, orderCount: -1 }); // popularity ranking
MenuItemSchema.index(
  { vendor: 1, slug: 1 },
  { unique: true, sparse: true },
);

// ─── Virtuals ────────────────────────────────────────────────────────────────

MenuItemSchema.virtual("effectivePrice").get(function () {
  return this.discountPrice ?? this.price;
});

MenuItemSchema.virtual("hasDiscount").get(function () {
  return (
    this.discountPrice !== null && (this.discountPrice as number) < this.price
  );
});

// ─── Middleware ───────────────────────────────────────────────────────────────

MenuItemSchema.pre("save", function () {
  (this as any)._wasNew = this.isNew;
  if (this.isModified("name") && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
});

MenuItemSchema.post("save", async function () {
  if ((this as any)._wasNew) {
    await MenuCategory.findByIdAndUpdate(this.category, {
      $inc: { itemCount: 1 },
    });
  }
});

// ── On delete ────────────────────────────────────────────────────────────────
MenuItemSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    await MenuCategory.findByIdAndUpdate(doc.category, {
      $inc: { itemCount: -1 },
    });
  }
});

const MenuItem = mongoose.model<IMenuItem>("MenuItem", MenuItemSchema);
export default MenuItem;
