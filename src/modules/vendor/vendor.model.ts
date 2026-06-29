import mongoose, { Schema } from "mongoose";
import { IOpeningHour, IVendor } from "./vendor.types";
import { decrypt, encrypt} from "@shared/utils/helpers";
import { addressSchema, bankDetailsSchema } from "@shared/models/shared.models";
import { IBankDetails } from "@shared/models/shared.types";


const openingHourSchema = new Schema<IOpeningHour>(
  {
    day: { type: String, required: true, min: 0, max: 6 },
    openTime: { type: String, default: "08:00" },
    closeTime: { type: String, default: "22:00" },
    isClosed: { type: Boolean, default: false },
  },
  { _id: false },
);

const vendorSchema = new Schema<IVendor>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      index: "text", // text index for search
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    cuisineTypes: {
      type: [String],
      required: true,
      default: [],
    },

    status: {
      type: String,
      enum: ["pending_approval", "active", "suspended", "closed"],
      default: "pending_approval",
      index: true,
    },

    isOpen: {
      type: Boolean,
      default: false,
    },

    logo: {
      type: String,
      required: true,
    },

    coverImage: {
      type: String,
      required: true,
    },

    proof_of_registration: {
      type: String,
      required: true,
    },
    proof_of_identification: {
      type: String,
      required: true,
    },

    address: {
      type: addressSchema,
      required: true,
    },

    location: {
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

    phone: {
      type: String,
      required: true,
    },

    openingHours: {
      type: [openingHourSchema],
      default: [],
    },

    avgRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    totalRatings: {
      type: Number,
      default: 0,
    },

    avgPrepTime: {
      type: Number,
      required: true,
      min: 1,
    },

    minOrderAmount: {
      type: Number,
      default: 0,
    },

    deliveryFee: {
      type: Number,
      default: 0,
    },

    commissionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    bankDetails: {
      type: bankDetailsSchema,
      required: true,
    },

    totalOrders: {
      type: Number,
      default: 0,
    },

    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// ─────────────────────────────────────────
// Indexes
// ─────────────────────────────────────────

vendorSchema.index({ location: "2dsphere" }); // geospatial queries
vendorSchema.index({ name: "text", tags: "text" }); // text search
vendorSchema.index({ status: 1, isFeatured: 1 }); // homepage featured query
vendorSchema.index({ owner: 1, status: 1 }); // vendor dashboard queries

// ─────────────────────────────────────────
// Encrypt bank details before saving
// ─────────────────────────────────────────

vendorSchema.pre<IVendor>(
  "save",
  function (this: IVendor): void {
    try {
      if (this.isModified("bankDetails")) {
        const bd = this.bankDetails;

        if (bd.accountNumber) bd.accountNumber = encrypt(bd.accountNumber);
        if (bd.bankName) bd.bankName = encrypt(bd.bankName);
        if (bd.accountName) bd.accountName = encrypt(bd.accountName);

        // Explicitly mark the field as modified
        this.markModified("bankDetails");
      }
    } catch (error: any) {
      throw new Error(`Failed to encrypt bank details: ${error?.message}`);
    }
  },
);

// ─────────────────────────────────────────
// Decrypt bank details when reading
// ─────────────────────────────────────────

vendorSchema.methods.getBankDetails = function (): IBankDetails {
  const bd = this.bankDetails.toObject();
  return {
    ...bd,
    accountNumber: bd.accountNumber ? decrypt(bd.accountNumber) : "",
    bankName: bd.bankName ? decrypt(bd.bankName) : "",
    accountName: bd.accountName ? decrypt(bd.accountName) : "",
  };
};

// ─────────────────────────────────────────
// Auto-generate slug from name
// ─────────────────────────────────────────

vendorSchema.pre("save", function (next) {
  if (this.isModified("name") && !this.slug) {
    this.slug =
      this.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-") + "-" + Math.random().toString(36).slice(2, 7);
  }
});

const Vendor = mongoose.model<IVendor>("Vendor", vendorSchema);

export default Vendor;
