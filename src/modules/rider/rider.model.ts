import {
  AvailabilityStatus,
  RiderStatus,
  VehicleType,
} from "@shared/types/enums";
import { decrypt, encrypt } from "@shared/utils/helpers";
import mongoose, { Schema } from "mongoose";
import { IRiderDocument, IRiderModel, TRider } from "./rider.types";
import { addressSchema, bankDetailsSchema, PointSchema } from "@shared/models/shared.models";
import { IBankDetails } from "@shared/models/shared.types";

// ─── Main schema ───────────────────────

const RiderSchema = new Schema<TRider>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Driver must be linked to a user account"],
      unique: true,
      index: true,
    },

    address: {
      type: addressSchema,
      required: true,
    },

    status: {
      type: String,
      enum: {
        values: Object.values(RiderStatus),
        message: "{VALUE} is not a valid rider status",
      },
      default: RiderStatus.PENDING_APPROVAL,
      index: true,
    },

    availability_status: {
      type: String,
      enum: {
        values: Object.values(AvailabilityStatus),
        message: "{VALUE} is not a valid availability status",
      },
      default: AvailabilityStatus.OFFLINE,
      index: true,
    },

    // ── Vehicle ───────────────────────────────────────────────────────────────
    vehicle_type: {
      type: String,
      enum: {
        values: Object.values(VehicleType),
        message: "{VALUE} is not a valid vehicle type",
      },
      required: [true, "Vehicle type is required"],
    },

    vehicle_plate_no: {
      type: String,
      trim: true,
      uppercase: true,
      default: null, // null for bicycle riders
    },

    // ── Verification documents ────────────────────────────────────────────────
    profile_picture: {
      type: String,
      required: true,
    },
    proof_of_identification: {
      type: String,
      required: true,
    },
    vehicle_document: {
      type: String,
      default: null, // Optional for bicycle riders
    },

    // ── Live location ─────────────────────────────────────────────────────────
    currentLocation: {
      type: PointSchema,
      default: null,
    },

    locationUpdatedAt: {
      type: Date,
      default: null,
      index: true,
    },

    // ── Delivery stats ────────────────────────────────────────────────────────
    totalDeliveries: {
      type: Number,
      default: 0,
      min: [0, "totalDeliveries cannot be negative"],
    },

    avgRating: {
      type: Number,
      default: 0,
      min: [0, "avgRating cannot be below 0"],
      max: [5, "avgRating cannot exceed 5"],
      set: (v: number) => Math.round(v * 100) / 100, // persist to 2 d.p.
    },

    totalRatings: {
      type: Number,
      default: 0,
      min: [0, "totalRatings cannot be negative"],
    },

    // ── Financials ────────────────────────────────────────────────────────────
    walletBalance: {
      type: Number,
      default: 0,
      min: [0, "walletBalance cannot be negative"],
    },

    totalEarnings: {
      type: Number,
      default: 0,
      min: [0, "totalEarnings cannot be negative"],
    },

    // ── Bank details (application-layer encryption) ────────────────────────────
    bankDetails: {
      type: bankDetailsSchema,
      default: (): IBankDetails => ({
        bankName: "",
        accountNumber: "",
        accountName: "",
        bankCode: "",
      }),
    },

    // ── Active delivery ─────────────────────────────────────────────────────────
    activeDelivery: {
      type: Schema.Types.ObjectId,
      ref: "Delivery",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: "__v",
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Required for all $geoNear / $nearSphere / $geoWithin queries
RiderSchema.index({ currentLocation: "2dsphere" });

// Dispatch query — nearby active + online riders
RiderSchema.index({
  status: 1,
  availability_status: 1,
  currentLocation: "2dsphere",
});

// Leaderboard / admin sort
RiderSchema.index({ totalDeliveries: -1, avgRating: -1 });

// ─── Virtuals ─────────────────────────────────────────────────────────────────

RiderSchema.virtual("bankDetailsDecrypted").get(function (
  this: IRiderDocument,
): IBankDetails | null {
  const bd = this.bankDetails;
  if (!bd) return null;
  try {
    return {
      bankName: bd.bankName ? decrypt(bd.bankName) : "",
      accountNumber: bd.accountNumber ? decrypt(bd.accountNumber) : "",
      accountName: bd.accountName ? decrypt(bd.accountName) : "",
      bankCode: bd.bankCode ? decrypt(bd.bankCode) : "",
    };
  } catch {
    // Gracefully handle key rotation or corrupted data
    return null;
  }
});

RiderSchema.virtual("isAvailable").get(function (
  this: IRiderDocument,
): boolean {
  return (
    this.status === RiderStatus.ACTIVE &&
    this.availability_status === AvailabilityStatus.ONLINE &&
    this.activeDelivery === null
  );
});

// ─── Pre-save hook — encrypt bank details before write ────────────────────────

RiderSchema.pre<IRiderDocument>("save", function (this: IRiderDocument): void {
  if (this.isModified("bankDetails")) {
    const bd = this.bankDetails;
    if (bd.bankName) bd.bankName = encrypt(bd.bankName);
    if (bd.accountNumber) bd.accountNumber = encrypt(bd.accountNumber);
    if (bd.accountName) bd.accountName = encrypt(bd.accountName);
    if (bd.bankCode) bd.bankCode = encrypt(bd.bankCode);
  }
});

// ─── Instance methods ─────────────────────────────────────────────────────────

RiderSchema.methods.addRating = async function (
  this: IRiderDocument,
  newRating: number,
): Promise<IRiderDocument> {
  const total = this.totalRatings + 1;
  this.avgRating = (this.avgRating * this.totalRatings + newRating) / total;
  this.totalRatings = total;
  return this.save();
};

RiderSchema.methods.updateLocation = async function (
  this: IRiderDocument,
  lng: number,
  lat: number,
): Promise<IRiderDocument> {
  this.currentLocation = { type: "Point", coordinates: [lng, lat] };
  this.locationUpdatedAt = new Date();
  return this.save();
};

RiderSchema.methods.creditEarnings = async function (
  this: IRiderDocument,
  amount: number,
): Promise<IRiderDocument> {
  this.walletBalance += amount;
  this.totalEarnings += amount;
  return this.save();
};

RiderSchema.methods.debitWallet = async function (
  this: IRiderDocument,
  amount: number,
): Promise<IRiderDocument> {
  if (this.walletBalance < amount) {
    throw new Error("Insufficient wallet balance for payout");
  }
  this.walletBalance -= amount;
  return this.save();
};

// ─── Static methods ───────────────────────────────────────────────────────────

RiderSchema.statics.findNearby = function (
  lng: number,
  lat: number,
  radiusMetres = 5_000,
) {
  return (this as IRiderModel)
    .find({
      status: RiderStatus.ACTIVE,
      availability_status: AvailabilityStatus.ONLINE,
      activeDelivery: null,
      currentLocation: {
        $nearSphere: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: radiusMetres,
        },
      },
    })
    .populate("owner", "firstName lastName phone avatar");
};

// ─── Model — guard against hot-reload re-registration ────────────────────────

const Rider = mongoose.model<TRider, IRiderModel>("Rider", RiderSchema);

export default Rider;
